import { InfluxDB } from 'influx';

let influx;

export async function initInflux() {
	if (!influx) {
		const database = process.env.INFLUXDB_DATABASE || 'beehive_data'

		// @ts-ignore
		influx = new InfluxDB({
			host: process.env.INFLUXDB_HOST || 'localhost',
			port: process.env.INFLUXDB_PORT || 8086,
			database
		});

		let dbNames = await influx.getDatabaseNames()

		if (!dbNames.includes(database)) {
			await influx.createDatabase(database);
		}
	}

	return influx;
}
