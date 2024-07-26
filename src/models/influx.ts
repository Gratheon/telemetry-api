//repl.repl.ignoreUndefined=true

import { InfluxDB } from '@influxdata/influxdb-client'
import config from '../config'

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
