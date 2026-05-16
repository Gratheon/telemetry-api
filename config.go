package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

type postgresConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
	DSN      string
}

func (c postgresConfig) ConnectionString() string {
	if strings.TrimSpace(c.DSN) != "" {
		return c.DSN
	}

	sslMode := c.SSLMode
	if sslMode == "" {
		sslMode = "disable"
	}

	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host,
		c.Port,
		c.User,
		c.Password,
		c.Database,
		sslMode,
	)
}

type config struct {
	Port                  int
	SchemaRegistryURL     string
	SelfURL               string
	UserCycleURL          string
	TestAuthBypassEnabled bool
	EnvironmentID         string
	LogLevel              string
	Postgres              postgresConfig
}

func readConfig() (config, error) {
	v := viper.New()
	v.SetConfigType("json")
	v.AddConfigPath("./config")
	v.AddConfigPath(".")

	envID := strings.TrimSpace(os.Getenv("ENV_ID"))
	if envID == "" {
		envID = "default"
	}

	configFileName := "config." + envID
	if os.Getenv("NATIVE") == "1" {
		configFileName = "config.native"
	}
	v.SetConfigName(configFileName)

	setConfigDefaults(v)

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return config{}, fmt.Errorf("read config file: %w", err)
		}
	}

	cfg := config{
		Port:                  v.GetInt("http_port"),
		SchemaRegistryURL:     v.GetString("schema_registry_url"),
		SelfURL:               v.GetString("self_url"),
		UserCycleURL:          v.GetString("user_cycle_url"),
		TestAuthBypassEnabled: v.GetBool("test_auth_bypass_enabled"),
		EnvironmentID:         envID,
		LogLevel:              v.GetString("log_level"),
		Postgres: postgresConfig{
			Host:     v.GetString("postgres.host"),
			Port:     v.GetInt("postgres.port"),
			User:     v.GetString("postgres.user"),
			Password: v.GetString("postgres.password"),
			Database: v.GetString("postgres.database"),
			SSLMode:  v.GetString("postgres.sslmode"),
			DSN:      v.GetString("postgres.dsn"),
		},
	}

	overrideConfigFromEnv(&cfg)
	return cfg, nil
}

func setConfigDefaults(v *viper.Viper) {
	v.SetDefault("http_port", 8600)
	v.SetDefault("schema_registry_url", "http://gql-schema-registry:3000")
	v.SetDefault("self_url", "telemetry-api:8600")
	v.SetDefault("user_cycle_url", "http://user-cycle:3000")
	v.SetDefault("test_auth_bypass_enabled", false)
	v.SetDefault("log_level", "info")
	v.SetDefault("postgres.host", "localhost")
	v.SetDefault("postgres.port", 5432)
	v.SetDefault("postgres.user", "test")
	v.SetDefault("postgres.password", "test")
	v.SetDefault("postgres.database", "telemetry-api")
	v.SetDefault("postgres.sslmode", "disable")
	v.SetDefault("postgres.dsn", "")
}

func overrideConfigFromEnv(cfg *config) {
	if value := strings.TrimSpace(os.Getenv("PORT")); value != "" {
		cfg.Port = getenvInt("PORT", cfg.Port)
	}
	if value := strings.TrimSpace(os.Getenv("SCHEMA_REGISTRY_HOST")); value != "" {
		cfg.SchemaRegistryURL = value
	}
	if value := strings.TrimSpace(os.Getenv("SCHEMA_REGISTRY_URL")); value != "" {
		cfg.SchemaRegistryURL = value
	}
	if value := strings.TrimSpace(os.Getenv("SELF_URL")); value != "" {
		cfg.SelfURL = value
	}
	if value := strings.TrimSpace(os.Getenv("USER_CYCLE_URL")); value != "" {
		cfg.UserCycleURL = value
	}
	if value := strings.TrimSpace(os.Getenv("USER_CYCLE_GRAPHQL_URL")); value != "" {
		cfg.UserCycleURL = value
	}
	if value := strings.TrimSpace(os.Getenv("TEST_AUTH_BYPASS_ENABLED")); value != "" {
		cfg.TestAuthBypassEnabled = strings.EqualFold(value, "true") || value == "1"
	}
	if value := strings.TrimSpace(os.Getenv("LOG_LEVEL")); value != "" {
		cfg.LogLevel = value
	}
	if value := strings.TrimSpace(os.Getenv("DB_HOST")); value != "" {
		cfg.Postgres.Host = value
	}
	if value := strings.TrimSpace(os.Getenv("DB_PORT")); value != "" {
		cfg.Postgres.Port = getenvInt("DB_PORT", cfg.Postgres.Port)
	}
	if value := strings.TrimSpace(os.Getenv("DB_USER")); value != "" {
		cfg.Postgres.User = value
	}
	if value := strings.TrimSpace(os.Getenv("DB_PASSWORD")); value != "" {
		cfg.Postgres.Password = value
	}
	if value := strings.TrimSpace(os.Getenv("DB_NAME")); value != "" {
		cfg.Postgres.Database = value
	}
	if value := strings.TrimSpace(os.Getenv("DB_SSLMODE")); value != "" {
		cfg.Postgres.SSLMode = value
	}
	if value := strings.TrimSpace(os.Getenv("DB_DSN")); value != "" {
		cfg.Postgres.DSN = value
	}
}

func getenvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	var parsed int
	if _, err := fmt.Sscanf(value, "%d", &parsed); err != nil {
		return fallback
	}

	return parsed
}
