const config = {
  sentryDsn: "",
  schemaRegistryHost: "http://gql-schema-registry:3000",
  selfUrl: "telemetry-api:8600",
  userCycleUrl: "http://user-cycle:4000",

  // MySQL configuration
  mysql: {
		host: 'mysql',
		port: '3306',
		user: 'test',
		password: 'test',
		database: 'telemetry-api',
  }
};

export default config;
