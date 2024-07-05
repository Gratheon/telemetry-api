
// local dependencies
import { logger } from './logger';

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
	}
}
