import { ApolloServer } from "apollo-server-fastify";
import { ApolloServerPluginDrainHttpServer, ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import fastify from "fastify";
import { buildSubgraphSchema } from '@apollo/federation';
import * as Sentry from '@sentry/node';
import { RewriteFrames } from "@sentry/integrations";
import gql from "graphql-tag";

import config from './config/index';
import { schema } from './schema';
import { resolvers } from './resolvers';
import { registerSchema } from "./schema-registry";
import { logger } from './logger'
import { registerRestAPI } from "./restAPI";
import { ApolloServerPluginInlineTraceDisabled } from "apollo-server-core";
import { initStorage } from "./storage";

// Add root handler import
import { rootHandler } from "./handlers/rootHandler";

Sentry.init({
	dsn: config.sentryDsn,
	environment: process.env.ENV_ID,
	tracesSampleRate: 1.0,
	integrations: [
		new RewriteFrames({
			// @ts-ignore
			root: global.__dirname,
		}),
	],
});


function fastifyAppClosePlugin(app) {
	return {
		async serverWillStart() {
			return {
				async drainServer() {
					await app.close();
				}
			};
		}
	};
}

async function startApolloServer(app, typeDefs, resolvers) {
	const server = new ApolloServer({
		schema: buildSubgraphSchema({ typeDefs: gql(typeDefs), resolvers }),
		plugins: [
			fastifyAppClosePlugin(app),
			ApolloServerPluginLandingPageGraphQLPlayground(),
			ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
			ApolloServerPluginInlineTraceDisabled()
		],
		context: (req) => {
			return {
				uid: req.request.raw.headers['internal-userid']
			};
		},
	});

	await server.start();
	app.register(server.createHandler());

	return server.graphqlPath;
}

(async function main() {
	// @ts-ignore
	const app = fastify({ logger });

	app.setErrorHandler(async (error, request, reply) => {
		// Logging locally
		logger.error(error);

		Sentry.withScope(function (scope) {
			scope.addEventProcessor(function (event) {
				//@ts-ignore
				return Sentry.addRequestDataToEvent(event, request);
			});
			//@ts-ignore
			Sentry.captureException(err);
		});

		reply.status(500).send({ error: "Something went wrong" });
	});

	app.get('/', rootHandler);

	app.get('/health', (request, reply) => {
		reply.send({ hello: 'world' })
	})

	try {		
		await initStorage(logger);
		
		await registerSchema(schema);
		logger.info('starting telemetry-api apollo server');
		await startApolloServer(app, schema, resolvers);

		registerRestAPI(app);

		const port = process.env.PORT || 5000;
		await app.listen(port, '0.0.0.0');
		
		logger.info(`📊 telemetry-api service is ready`);
		logger.info(`To report metrics over API use POST http://localhost:${port}/metric`);
		logger.info(`To use graphql, use POST http://localhost:${port}/graphql`);
	} catch (e) {
		logger.error(e);
	}
})();
