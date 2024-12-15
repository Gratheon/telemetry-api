// local dependencies
import {logger} from './logger';
import {addMetricHandler} from "./controllers/add-metric";
import {errorCodes, TelemetryServerError} from "./error";
import {initInflux, readMetricsFromInflux} from "./models/influx";

function wrapGraphqlError(code, message) {
    return {
        __typename: 'TelemetryError',
        code,
        message
    };
}

let influxClient = initInflux();

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

export const resolvers = {
    Query: {
        temperatureCelsius: async (_, {hiveId, timeRangeMin}, ctx) => {
            let err = validateTimeRange(timeRangeMin);
            if(err) {
                return err;
            }

            return await readMetricsFromInflux(influxClient, hiveId, timeRangeMin, "temperatureCelsius");
        },
        humidityPercent: async (_, {hiveId, timeRangeMin}, ctx) => {
            let err = validateTimeRange(timeRangeMin);
            if(err) {
                return err;
            }

            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, timeRangeMin, "humidityPercent");
        },
        weightKg: async (_, {hiveId, timeRangeMin}, ctx) => {
            let err = validateTimeRange(timeRangeMin);
            if(err) {
                return err;
            }
            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, timeRangeMin, "weightKg");
        }
    },
    Mutation: {
        addMetric: async (_, {hiveId, fields}, ctx) => {
            logger.info(`Mutation.addMetric called: ${ctx.uid}`);

            try {
                await addMetricHandler(influxClient, {
                    hiveId,
                    fields
                });
            } catch (err) {
                logger.errorEnriched('Error writing to InfluxDB', err);

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
