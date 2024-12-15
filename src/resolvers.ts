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
            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, "temperature_celsius");
        },
        humidityPercent: async (_, {hiveId}, ctx) => {
            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, "humidity_percent");
        },
        weightKg: async (_, {hiveId}, ctx) => {
            logger.info(`Query.telemetry queried: ${ctx.uid}`);
            return await readMetricsFromInflux(influxClient, hiveId, "weight_kg");
        }
    },
    Mutation: {
        addMetric: async (_, {hiveId, fields}, ctx) => {
            logger.info(`Mutation.addMetric called: ${ctx.uid}`);

            try {
                await addMetricHandler(influxClient, {
                    hive_id: hiveId,
                    fields
                });
            } catch (e) {
                if (e instanceof TelemetryServerError) {
                    logger.errorEnriched('Error writing to InfluxDB', e);

                    return {
                        __typename: 'Error',
                        message: e.message,
                        code: e.errorCode
                    };
                } else {
                    logger.errorEnriched('Error writing to InfluxDB', e);
                    return {
                        __typename: 'Error',
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
