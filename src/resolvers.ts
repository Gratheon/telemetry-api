
// local dependencies
import { logger } from './logger';
import {addMetricHandler} from "./controllers/add-metric";
import {errorCodes, TelemetryServerError} from "./error";

function err(code) {
	return {
		__typename: 'Error',
		code
	};
}

export const resolvers = {
	Query: {
		telemetry:  (_, __, ctx) => {
			logger.info(`Query.telemetry queried: ${ctx.uid}`);
			return "hi"
		}
	},
	Mutation: {
		addMetric: async (_, { hiveId, fields }, ctx) => {
			logger.info(`Mutation.addMetric called: ${ctx.uid}`);

			try {
				await addMetricHandler({
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
