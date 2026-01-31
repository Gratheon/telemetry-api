import {writeBeehiveMetricsToMySQL, writeBatchBeehiveMetricsToMySQL} from "../models/mysql";
import {errorCodes, TelemetryServerError} from "../error";

export async function addIoTMetrics(input) {
    const metrics = Array.isArray(input) ? input : [input];

    if (metrics.length === 0) {
        throw new TelemetryServerError("Bad Request: no metrics provided", errorCodes.fieldsMissing, 400);
    }

    // Validate all metrics first
    const validatedMetrics = metrics.map(metric => {
        if (!metric.hiveId) {
            throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
        }

        if (!metric.fields || Object.keys(metric.fields).length === 0) {
            throw new TelemetryServerError("Bad Request: fields not provided", errorCodes.fieldsMissing, 400);
        }

        const timestamp = metric.timestamp ? new Date(metric.timestamp * 1000) : new Date();

        return {
            hiveId: metric.hiveId,
            fields: metric.fields,
            timestamp
        };
    });

    // Use batch insert for multiple metrics
    if (validatedMetrics.length > 1) {
        await writeBatchBeehiveMetricsToMySQL(validatedMetrics);
    } else {
        // Use single insert for one metric
        const metric = validatedMetrics[0];
        await writeBeehiveMetricsToMySQL(metric.hiveId, metric.fields, metric.timestamp);
    }
}
