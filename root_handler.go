package main

import "net/http"

func rootHandler(w http.ResponseWriter, _ *http.Request) {
	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Telemetry API</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Telemetry API</h1>
  <p>Telemetry collection and GraphQL query service.</p>
  <ul>
    <li><code>GET /health</code></li>
    <li><code>GET /metrics</code></li>
    <li><code>GET /graphql</code></li>
    <li><code>POST /graphql</code></li>
    <li><code>POST /iot/v1/metrics</code></li>
    <li><code>POST /entrance/v1/movement</code></li>
  </ul>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(html))
}
