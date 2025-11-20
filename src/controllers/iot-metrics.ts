import {writeBeehiveMetricsToMySQL} from "../models/mysql";
import {errorCodes, TelemetryServerError} from "../error";

export async function addIoTMetrics(input) {
    const metrics = Array.isArray(input) ? input : [input];

    if (metrics.length === 0) {
        throw new TelemetryServerError("Bad Request: no metrics provided", errorCodes.fieldsMissing, 400);
    }

    for (const metric of metrics) {
        if (!metric.hiveId) {
            throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
        }

        if (!metric.fields || Object.keys(metric.fields).length === 0) {
            throw new TelemetryServerError("Bad Request: fields not provided", errorCodes.fieldsMissing, 400);
        }

        const timestamp = metric.timestamp ? new Date(metric.timestamp * 1000) : new Date();

        await writeBeehiveMetricsToMySQL(metric.hiveId, metric.fields, timestamp);
    }
}
