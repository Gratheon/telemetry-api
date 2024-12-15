// local dependencies
import {logger} from './logger';
import {addMetricHandler} from "./controllers/add-metric";
import {errorCodes, TelemetryServerError} from "./error";
import {initInflux, readMetricsFromInflux} from "./models/influx";

function err(code) {
    return {
        __typename: 'Error',
        code
    };
}

let influxClient = initInflux();

export const resolvers = {
    Query: {
        temperatureCelsius: async (_, {hiveId}, ctx) => {
            return await readMetricsFromInflux(influxClient, hiveId, "temperatureCelsius");
        },
        humidityPercent: async (_, {hiveId}, ctx) => {
            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, "humidityPercent");
        },
        weightKg: async (_, {hiveId}, ctx) => {
            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, "weightKg");
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
            } catch (e) {
                if (e instanceof TelemetryServerError) {
                    logger.errorEnriched('Error writing to InfluxDB', e);

                    return {
                        __typename: 'TelemetryError',
                        message: e.message,
                        code: e.errorCode
                    };
                } else {
                    logger.errorEnriched('Error writing to InfluxDB', e);
                    return {
                        __typename: 'TelemetryError',
                        message: 'Internal Server Error',
                        code: errorCodes.internalServerError
                    };
                }
            }

            return {
                __typename: "AddMetricMessage",
                message: 'OK'
            };
        }
    }
}
