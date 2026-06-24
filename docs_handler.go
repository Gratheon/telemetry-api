package main

import "net/http"

const swaggerUIDocsHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gratheon Telemetry REST API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.32.8/swagger-ui.css" />
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .topbar { display: none; }
    .docs-header { padding: 18px 24px; border-bottom: 1px solid #ddd; }
    .docs-header h1 { margin: 0 0 8px; font-size: 24px; }
    .docs-header p { margin: 0 0 12px; max-width: 860px; line-height: 1.5; }
    .docs-header a { margin-right: 12px; color: #111; }
  </style>
</head>
<body>
  <header class="docs-header">
    <h1>Gratheon Telemetry REST API</h1>
    <p>This Swagger UI is hosted by telemetry-api itself, so the documentation follows the service-owned OpenAPI contract. Import the OpenAPI URL into Postman, Bruno, or Insomnia to generate client collections.</p>
    <a href="/openapi.json">OpenAPI JSON</a>
    <a href="https://github.com/Gratheon/telemetry-api">GitHub</a>
  </header>
  <main id="swagger-ui"></main>
  <script src="https://unpkg.com/swagger-ui-dist@5.32.8/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true
    });
  </script>
</body>
</html>`

func writeOpenAPISpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write(openapiSpec)
	}
}

func writeSwaggerUIDocs(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(swaggerUIDocsHTML))
}
