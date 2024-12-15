//repl.repl.ignoreUndefined=true

import {InfluxDB, Point} from '@influxdata/influxdb-client'
import config from '../config'
import {logger} from "../logger";

let client

export async function initInflux() {
	if (!client) {
		const token = config.influxToken;
		const port = process.env.INFLUXDB_PORT || 8086
		const host = process.env.INFLUXDB_HOST || 'localhost'
		const url = `http://${host}:${port}`

		client = new InfluxDB({ url, token })
	}

	return client;
}



export async function writeMetricsToInflux(influx, data) {
	let writeClient = influx.getWriteApi(config.influxOrg, config.influxBucket, 'ns')

	let point = new Point('beehive_metrics').tag('hive_id', data.hive_id)

	if(data.fields.temperature_celsius != null) {
		point.floatField("temperature_celsius", data.fields.temperature_celsius)
	}

	if (data.fields.humidity_percent != null) {
		point.floatField("humidity_percent", data.fields.humidity_percent)
	}

	if (data.fields.weight_kg != null) {
		point.floatField("weight_kg", data.fields.weight_kg)
	}


	writeClient.writePoint(point)
	writeClient.flush()

	logger.info('Data written to InfluxDB', point);
}