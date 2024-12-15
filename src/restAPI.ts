// global dependencies
import fastifyRawBody from "fastify-raw-body";
import { Point } from "@influxdata/influxdb-client";

// local dependencies
import { logger } from "./logger";
import config from "./config/index";

import { initInflux, writeMetricsToInflux } from "./models/influx";

class TelemetryServerError extends Error {
  // You can add any additional properties or methods you need
  constructor(message: string, public httpStatus?: number) {
    super(message); // Call the parent class constructor with the message
    this.name = 'TelemetryServerError'; // Set the name of the error to your custom type
    this.message = message;
    this.httpStatus = httpStatus;
  }
}


export function registerRestAPI(app) {
  app.register(fastifyRawBody, {
    field: "rawBody", // change the default request.rawBody property name
    global: false, // add the rawBody to every request. **Default true**
    encoding: "utf8", // set it to false to set rawBody as a Buffer **Default utf8**
    runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
    routes: [], // array of routes, **`global`** will be ignored, wildcard routes not supported
  });

  app.post("/metric", {
    config: {
      // add the rawBody to this route. if false, rawBody will be disabled when global is true
      rawBody: true,
    },
    handler: async (req, res) => {
      const data = req.body;
      logger.info("Received metric data", data);

      try {
        await addMetricHandler(data);
        res.status(200).send({
            message: "OK",
        });
      } catch (e: any) {
        if (e instanceof TelemetryServerError) {
          logger.errorEnriched("Error writing to InfluxDB", e);
          res.status(e.httpStatus)
            .send(JSON.stringify({
              error: e.message
            }));
        } else {
            logger.errorEnriched("Error writing to InfluxDB", e);
            res.status(500)
                .send("Internal Server Error");
        }
      }
    },
  });
}

async function addMetricHandler(input) {
  if (!input.hive_id) {
    throw new TelemetryServerError("Bad Request: hive_id not provided", 400);
  }

  if (!input.fields) {
    throw new TelemetryServerError("Bad Request: fields not provided", 400);
  }

  let influx = await initInflux();
  await writeMetricsToInflux(influx, input);
}

