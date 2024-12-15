import {initInflux, writeMetricsToInflux} from "../models/influx";
import {errorCodes, TelemetryServerError} from "../error";

export async function addMetricHandler(input) {
    if (!input.hive_id) {
        throw new TelemetryServerError("Bad Request: hive_id not provided", errorCodes.hiveIdMissing, 400);
    }

    if (!input.fields) {
        throw new TelemetryServerError("Bad Request: fields not provided", errorCodes.fieldsMissing, 400);
    }

    let influx = await initInflux();
    await writeMetricsToInflux(influx, input);
}

