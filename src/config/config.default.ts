const config = {
	sentryDsn: "",
	schemaRegistryHost: "http://gql-schema-registry:3000",
	selfUrl: "telemetry-api:5000",

	// you get this token from the InfluxDB UI after you spin up container
	// and go through installation
	// see github.com/gratheon/grafana docker-compose.yml
	influxToken: "",
	influxOrg: "gratheon",
	influxBucket: "gratheon"
};

export default config;
