// global dependencies
import fastifyRawBody from 'fastify-raw-body';

// local dependencies
import { logger } from './logger';
// import config from './config/index';

import { initInflux } from './models/influx';

export function registerRestAPI(app) {

	app.register(fastifyRawBody, {
		field: 'rawBody', // change the default request.rawBody property name
		global: false, // add the rawBody to every request. **Default true**
		encoding: 'utf8', // set it to false to set rawBody as a Buffer **Default utf8**
		runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
		routes: [] // array of routes, **`global`** will be ignored, wildcard routes not supported
	})

	app.post('/metric', {
		config: {
			// add the rawBody to this route. if false, rawBody will be disabled when global is true
			rawBody: true
		},
		handler: async (req, res) => {

			const data = req.body;
			logger.info('Received metric data', data);


			try {
				const points = [
					{
						measurement: data?.metric_name ? data.metric_name : 'beehive_metrics',
						tags: {
							hive_id: data?.hive_id ? data.hive_id : 'unknown',
						},
						fields: {
							value: data?.value ? parseFloat(data.value) : 0
						}
					}
				];

				let influx = await initInflux()
				await influx.writePoints(points);
				logger.info('Data written to InfluxDB');
				res.status(200).send('Data logged');
			} catch (error) {
				logger.error('Error writing to InfluxDB');
				console.error(error);
				res.status(500).send('Internal Server Error');
			}
		}
	})
}
