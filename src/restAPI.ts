// global dependencies
import fastifyRawBody from "fastify-raw-body";

// local dependencies
import { logger } from "./logger";

import {addIoTMetrics} from "./controllers/iot-metrics";
import {TelemetryServerError} from "./error";
import {addEntranceMovement} from "./controllers/entrance-movement";
import { authenticateApiToken } from "./middleware/auth";


export function registerRestAPI(app) {
  app.register(fastifyRawBody, {
    field: "rawBody", // change the default request.rawBody property name
    global: false, // add the rawBody to every request. **Default true**
    encoding: "utf8", // set it to false to set rawBody as a Buffer **Default utf8**
    runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
    routes: [], // array of routes, **`global`** will be ignored, wildcard routes not supported
  });

  // Register the authentication middleware as a preHandler hook
  const authenticateHook = async (req, res) => {
    await authenticateApiToken(req, res, () => {});
  };

  app.post("/iot/v1/metrics", {
    config: {
      // add the rawBody to this route. if false, rawBody will be disabled when global is true
      rawBody: true,
    },
    preHandler: authenticateHook,
    handler: async (req, res) => {
      const requestInput = req.body;
      logger.info("Received metric data", requestInput);

      try {
        await addIoTMetrics(requestInput);
        res.status(200).send({
            message: "OK",
        });
      } catch (e: any) {
        if (e instanceof TelemetryServerError) {
          logger.errorEnriched("Error writing to MySQL", e);
          res.status(e.httpStatus)
            .send(JSON.stringify({
              error: e.message
            }));
        } else {
            logger.errorEnriched("Error writing to MySQL", e);
            res.status(500)
                .send(JSON.stringify({
                  error: "Internal Server Error"
                }));
        }
      }
    },
  });

  app.post("/entrance/v1/movement", {
    config: {
      // add the rawBody to this route. if false, rawBody will be disabled when global is true
      rawBody: true,
    },
    preHandler: authenticateHook,
    handler: async (req, res) => {
      const requestInput = req.body;
      logger.info("Received metric data", requestInput);

      try {
        await addEntranceMovement(requestInput);
        res.status(200).send({
            message: "OK",
        });
      } catch (e: any) {
        if (e instanceof TelemetryServerError) {
          logger.errorEnriched("Error writing to MySQL", e);
          res.status(e.httpStatus)
            .send(JSON.stringify({
              error: e.message
            }));
        } else {
            logger.errorEnriched("Error writing to MySQL", e);
            res.status(500)
                .send(JSON.stringify({
                  error: "Internal Server Error"
                }));
        }
      }
    },
  });
}