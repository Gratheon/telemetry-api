// global dependencies
import fastifyRawBody from 'fastify-raw-body';
import { Point } from '@influxdata/influxdb-client'

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

	app.post('/metric/:hiveId', {
		config: {
			// add the rawBody to this route. if false, rawBody will be disabled when global is true
			rawBody: true
		},
		handler: async (req, res) => {
			const { hiveId } = req.params;
			const data = req.body;
			logger.info('Received metric data', data);

			try {
				let influx = await initInflux()
				let org = `gratheon` // change to be UID specific
				let bucket = `gratheon`

				let writeClient = influx.getWriteApi(org, bucket, 'ns')

				let point = new Point('beehive_metrics')
					.tag('hive_id', hiveId)

				// for each data.fields field, create a field with the same name
				Object.entries(data.fields).forEach(([key, value]) => {
					point.intField(key, value)
				})

				writeClient.writePoint(point)
				writeClient.flush()

				logger.info('Data written to InfluxDB', point);
				res.status(200).send('OK');
			} catch (error) {
				logger.error('Error writing to InfluxDB');
				//@ts-ignore
				console.error(error.message);
				res.status(500).send('Internal Server Error');
			}
		}
	})
}
