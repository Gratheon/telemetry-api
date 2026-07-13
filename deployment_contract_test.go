package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestProductionDeploymentUsesIsolatedComposeProject(t *testing.T) {
	restartScript, err := os.ReadFile("restart.sh")
	if err != nil {
		t.Fatalf("read restart.sh: %v", err)
	}

	script := string(restartScript)
	if !strings.Contains(script, `PROJECT_NAME="${COMPOSE_PROJECT_NAME:-telemetry-api}"`) {
		t.Fatal("restart.sh must default to an isolated telemetry-api Compose project")
	}
	if strings.Contains(script, "COMPOSE_PROJECT_NAME=gratheon") {
		t.Fatal("restart.sh must not join the shared gratheon Compose project")
	}
}

func TestProductionConfigIsMountedButExcludedFromImage(t *testing.T) {
	compose, err := os.ReadFile("docker-compose.prod.yml")
	if err != nil {
		t.Fatalf("read docker-compose.prod.yml: %v", err)
	}
	if !strings.Contains(string(compose), "./config/config.prod.json:/app/config/config.prod.json:ro") {
		t.Fatal("production config must be mounted read-only at runtime")
	}

	dockerIgnore, err := os.ReadFile(".dockerignore")
	if err != nil {
		t.Fatalf("read .dockerignore: %v", err)
	}
	if !strings.Contains(string(dockerIgnore), "config/config.prod.json*") {
		t.Fatal("all production config files and backups must be excluded from the image")
	}

	matches, err := filepath.Glob("config/config.prod.json*")
	if err != nil {
		t.Fatalf("glob production configs: %v", err)
	}
	for _, match := range matches {
		if strings.HasSuffix(match, ".example") {
			continue
		}
		if _, err := os.Stat(match); err != nil && !os.IsNotExist(err) {
			t.Fatalf("stat %s: %v", match, err)
		}
	}
}
