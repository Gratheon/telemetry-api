import {writeBeehiveMetricsToInflux} from "../models/influx";
import {errorCodes, TelemetryServerError} from "../error";

export async function addMetricHandler(influx, input) {
    if (!input.hiveId) {
        throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
    }

    if (!input.fields || Object.keys(input.fields).length === 0) {
        throw new TelemetryServerError("Bad Request: fields not provided", errorCodes.fieldsMissing, 400);
    }

    await writeBeehiveMetricsToInflux(influx, input.hiveId, input.fields);
}

