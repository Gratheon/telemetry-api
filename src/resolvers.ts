
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

// 			let queryClient = client.getQueryApi(org)
// let fluxQuery = `from(bucket: "beehive_metrics")
//  |> range(start: -10m)
//  |> filter(fn: (r) => r._measurement == "measurement1")`

// queryClient.queryRows(fluxQuery, {
//   next: (row, tableMeta) => {
//     const tableObject = tableMeta.toObject(row)
//     console.log(tableObject)
//   },
//   error: (error) => {
//     console.error('\nError', error)
//   },
//   complete: () => {
//     console.log('\nSuccess')
//   },
// })

			logger.info(`Query.telemetry queried: ${ctx.uid}`);
			return "hi"
		}
	}
}
