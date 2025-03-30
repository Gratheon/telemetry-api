import {writeBeehiveMetricsToMySQL} from "../models/mysql";
import {errorCodes, TelemetryServerError} from "../error";

export async function addIoTMetrics(input) {
    if (!input.hiveId) {
        throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
    }

    if (!input.fields || Object.keys(input.fields).length === 0) {
        throw new TelemetryServerError("Bad Request: fields not provided", errorCodes.fieldsMissing, 400);
    }

    await writeBeehiveMetricsToMySQL(input.hiveId, input.fields);
}
