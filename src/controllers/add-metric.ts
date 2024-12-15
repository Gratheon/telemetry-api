import {writeMetricsToInflux} from "../models/influx";
import {errorCodes, TelemetryServerError} from "../error";

export async function addMetricHandler(influx, input) {
    if (!input.hive_id) {
        throw new TelemetryServerError("Bad Request: hive_id not provided", errorCodes.hiveIdMissing, 400);
    }

    if (!input.fields || Object.keys(input.fields).length === 0) {
        throw new TelemetryServerError("Bad Request: fields not provided", errorCodes.fieldsMissing, 400);
    }

    await writeMetricsToInflux(influx, input.hiveId, input.fields);
}

