// local dependencies
import {logger} from './logger';
import {errorCodes, TelemetryServerError} from "./error";

import {addIoTMetrics} from "./controllers/iot-metrics";

import {
    readMetricsFromMySQL,
    readAggregatedMetricsFromMySQLForToday,
    readEntranceMovementFromMySQL
} from "./models/mysql";

function wrapGraphqlError(code, message) {
    return {
        __typename: 'TelemetryError',
        code,
        message
    };
}

function validateTimeRange(timeRangeMin) {
    if (timeRangeMin == null) {
        timeRangeMin = 60
    }

    if(timeRangeMin <= 0) {
        return wrapGraphqlError(errorCodes.invalidTimeRange, "Time range must be positive");
    }

    if(timeRangeMin > 60*24*7) {
        return wrapGraphqlError(errorCodes.invalidTimeRange, "Time range cannot exceed 7 days");
    }

    return null;
}

// wrapMetricsResponse wraps the response of a metrics query in a try-catch block
// and returns a GraphQL error if an error occurs
// needed just to avoid code duplication in multiple resolvers
async function wrapMetricsResponse(f: () => Promise<any>) {
    try{
        return {
            __typename: "MetricFloatList",
            metrics: await f()
        };
    }
    catch(err) {
        logger.errorEnriched('Error reading from MySQL', err);

        if (err instanceof TelemetryServerError) {
            return wrapGraphqlError(err.errorCode, err.message);
        } else {
            return wrapGraphqlError(errorCodes.internalServerError, "Internal server error");
        }
    }
}

export const resolvers = {
    Query: {
        temperatureCelsius: async (_, {hiveId, timeRangeMin}, ctx) => {
            let err = validateTimeRange(timeRangeMin);
            if(err) {
                return err;
            }

            return wrapMetricsResponse(()=>{
                return readMetricsFromMySQL(hiveId, timeRangeMin, "temperatureCelsius")
            })
        },
        humidityPercent: async (_, {hiveId, timeRangeMin}, ctx) => {
            let err = validateTimeRange(timeRangeMin);
            if(err) {
                return err;
            }

            return wrapMetricsResponse(()=>{
                return readMetricsFromMySQL(hiveId, timeRangeMin, "humidityPercent")
            })
        },
        weightKg: async (_, {hiveId, timeRangeMin}, ctx) => {
            let err = validateTimeRange(timeRangeMin);
            if(err) {
                return err;
            }

            return wrapMetricsResponse(()=>{
                return readMetricsFromMySQL(hiveId, timeRangeMin, "weightKg")
            })
        },
        entranceMovementToday: async (_, {hiveId, boxId}, ctx) => {
            try{
                return {
                    __typename: "BeeMovementInOutResult",
                    ... (await readAggregatedMetricsFromMySQLForToday(hiveId, boxId, ["beesIn", "beesOut"]))
                };
            }
            catch(err) {
                logger.errorEnriched('Error reading from MySQL', err);

                if (err instanceof TelemetryServerError) {
                    return wrapGraphqlError(err.errorCode, err.message);
                } else {
                    return wrapGraphqlError(errorCodes.internalServerError, "Internal server error");
                }
            }
        },
        entranceMovement: async (_, {hiveId, boxId, timeFrom, timeTo}, ctx) => {
            try{
                return {
                    __typename: "EntranceMovementList",
                    metrics: await readEntranceMovementFromMySQL(hiveId, boxId, timeFrom, timeTo)
                };
            }
            catch(err) {
                logger.errorEnriched('Error reading from MySQL', err);

                if (err instanceof TelemetryServerError) {
                    return wrapGraphqlError(err.errorCode, err.message);
                } else {
                    return wrapGraphqlError(errorCodes.internalServerError, "Internal server error");
                }
            }
        }
    },
    Mutation: {
        addMetric: async (_, {hiveId, fields}, ctx) => {
            logger.info(`Mutation.addMetric called: ${ctx.uid}`);

            try {
                await addIoTMetrics({
                    hiveId,
                    fields
                });
            } catch (err) {
                logger.errorEnriched('Error writing to MySQL', err);

                if (err instanceof TelemetryServerError) {
                    return wrapGraphqlError(err.errorCode, err.message);
                } else {
                    return wrapGraphqlError(errorCodes.internalServerError, "Internal server error");

                }
            }

            return {
                __typename: "AddMetricMessage",
                message: 'OK'
            };
        }
    }
}
