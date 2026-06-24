package main

import _ "embed"

//go:embed schema.graphql
var graphqlSchema string

// openapiSpec is embedded so the running service exposes the same REST contract
// that the public documentation generator can consume from this repository.
//
//go:embed openapi.json
var openapiSpec []byte
