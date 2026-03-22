const config = {
  sentryDsn: "",
  schemaRegistryHost: "http://gql-schema-registry:3000",
  selfUrl: "telemetry-api:8600",
  userCycleUrl: "http://user-cycle:4000",

  postgres: {
    host: process.env.DB_HOST || "postgres",
    port: process.env.DB_PORT || "5432",
    user: process.env.DB_USER || "test",
    password: process.env.DB_PASSWORD || "test",
    database: process.env.DB_NAME || "telemetry-api",
  },
};

export default config;
