//repl.repl.ignoreUndefined=true

import {InfluxDB, Point} from '@influxdata/influxdb-client'
import config from '../config'
import {logger} from "../logger";

let client

export function initInflux() {
	if (!client) {
		const token = config.influxToken;
		const port = process.env.INFLUXDB_PORT || 8086
		const host = process.env.INFLUXDB_HOST || 'localhost'
		const url = `http://${host}:${port}`

		client = new InfluxDB({ url, token })
	}

	return client;
}

export async function readMetricsFromInflux(influx, hiveId, field:string) {
	let queryApi = influx.getQueryApi(config.influxOrg)

	// let queryClient = client.getQueryApi(org)
	let fluxQuery = `from(bucket: "${config.influxBucket}")
 |> range(start: -60m)
 |> filter(fn: (r) => r._measurement == "beehive_metrics")
 |> filter(fn: (r) => r.hive_id == "${hiveId}")
 |> filter(fn: (r) => r._field == "${field}")
 |> sort(columns: ["_time"])
 `


	return new Promise((resolve, reject) => {
		const results = [];
		queryApi.queryRows(fluxQuery, {
			next: (row, tableMeta) => {
				console.log({row})
				const tableObject = tableMeta.toObject(row);
				results.push({
					time: tableObject._time,
					value: tableObject._value,
				});
			},
			error: (error) => {
				console.error('Error', error);
				reject(error);
			},
			complete: () => {
				console.log('Success');
				resolve(results);
			},
		});
	});
}


export async function writeMetricsToInflux(influx, hiveId, fields) {
	let writeClient = influx.getWriteApi(config.influxOrg, config.influxBucket, 'ns')

	let point = new Point('beehive_metrics').tag('hive_id', hiveId)

	if(fields.temperature_celsius != null) {
		point.floatField("temperature_celsius", fields.temperatureCelsius)
	}

	if (fields.humidity_percent != null) {
		point.floatField("humidity_percent", fields.humidityPercent)
	}

	if (fields.weight_kg != null) {
		point.floatField("weight_kg", fields.weightKg)
	}


	writeClient.writePoint(point)
	writeClient.flush()

	logger.info('Data written to InfluxDB', point);
}