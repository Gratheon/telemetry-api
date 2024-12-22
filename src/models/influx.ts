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

const beehiveMetrics = 'beehive_metrics'
const entranceObserver = 'entrance_observer'

export async function readMetricsFromInflux(influx, hiveId, rangeMin=60, field:string) {
	let queryApi = influx.getQueryApi(config.influxOrg)

	// let queryClient = client.getQueryApi(org)
	let fluxQuery = `from(bucket: "${config.influxBucket}")
 |> range(start: -${rangeMin}m)
 |> filter(fn: (r) => r._measurement == "${beehiveMetrics}")
 |> filter(fn: (r) => r.hiveId == "${hiveId}")
 |> filter(fn: (r) => r._field == "${field}")
 |> sort(columns: ["_time"])
 `

	return new Promise((resolve, reject) => {
		const results = [];
		queryApi.queryRows(fluxQuery, {
			next: (row, tableMeta) => {
				const tableObject = tableMeta.toObject(row);
				results.push({
					t: tableObject._time,
					v: tableObject._value,
				});
			},
			error: (error) => {
				logger.error(error);
				reject(error);
			},
			complete: () => {
				resolve(results);
			},
		});
	});
}


export async function writeBeehiveMetricsToInflux(influx, hiveId, fields) {
	let writeClient = influx.getWriteApi(config.influxOrg, config.influxBucket, 'ns')

	let point = new Point(beehiveMetrics).tag('hiveId', hiveId)

	if(fields.temperatureCelsius != null) {
		point.floatField("temperatureCelsius", fields.temperatureCelsius)
	}

	if (fields.humidityPercent != null) {
		point.floatField("humidityPercent", fields.humidityPercent)
	}

	if (fields.weightKg != null) {
		point.floatField("weightKg", fields.weightKg)
	}


	writeClient.writePoint(point)
	await writeClient.flush()
}

export async function writeEntranceMovementToInflux(influx, hiveId, beesOut, beesIn) {
	let writeClient = influx.getWriteApi(config.influxOrg, config.influxBucket, 'ns')

	let point = new Point(entranceObserver).tag('hiveId', hiveId)


	if (beesOut != null) {
		point.floatField("beesOut", beesOut)
	}

	if (beesIn != null) {
		point.floatField("beesIn", beesIn)
	}


	writeClient.writePoint(point)
	await writeClient.flush()
}