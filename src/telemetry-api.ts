import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import fastifyApollo, { fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastify from "fastify";
import { buildSubgraphSchema } from "@apollo/subgraph";
import * as Sentry from '@sentry/node';
import { RewriteFrames } from "@sentry/integrations";
import { parse } from "graphql";

import config from './config/index';
import { schema } from './schema';
import { resolvers } from './resolvers';
import { registerSchema } from "./schema-registry";
import { fastifyLogger, logger } from './logger'
import { registerRestAPI } from "./restAPI";
import { initStorage } from "./storage";

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


async function startApolloServer(app, typeDefs, resolvers) {
	const server = new ApolloServer({
		schema: buildSubgraphSchema({ typeDefs: parse(typeDefs), resolvers }),
		plugins: [
			fastifyApolloDrainPlugin(app),
			ApolloServerPluginLandingPageLocalDefault(),
			ApolloServerPluginInlineTraceDisabled()
		],
	});

	await server.start();
	await app.register(fastifyApollo(server), {
		context: async (request) => {
			return {
				uid: request.headers["internal-userid"],
			};
		},
	});
}

(async function main() {
	const app = fastify({ loggerInstance: fastifyLogger });

	app.setErrorHandler(async (error, request, reply) => {
		// Logging locally
		logger.error(error);

		Sentry.withScope(function (scope) {
			scope.addEventProcessor(function (event) {
				//@ts-ignore
				return Sentry.addRequestDataToEvent(event, request);
			});
			Sentry.captureException(error);
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

		const port = Number(process.env.PORT) || 5000;
		await app.listen({ port, host: "0.0.0.0" });
		
		logger.info(`📊 telemetry-api service is ready`);
		logger.info(`To report metrics over API use POST http://localhost:${port}/metric`);
		logger.info(`To use graphql, use POST http://localhost:${port}/graphql`);
	} catch (e) {
		logger.error(e);
	}
})();
