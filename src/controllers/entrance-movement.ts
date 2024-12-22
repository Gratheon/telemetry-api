import {writeBeehiveMetricsToInflux, writeEntranceMovementToInflux} from "../models/influx";
import {errorCodes, TelemetryServerError} from "../error";

export async function addEntranceMovement(influx, input) {
    if (!input.hiveId) {
        throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
    }
    if (!input.sectionId) {
        throw new TelemetryServerError("Bad Request: sectionId not provided", errorCodes.hiveIdMissing, 400);
    }

    if (!input.beesOut && !input.beesIn) {
        throw new TelemetryServerError("Bad Request: beesOut or beesIn are not provided", errorCodes.fieldsMissing, 400);
    }

    await writeEntranceMovementToInflux(influx, input.hiveId, input.beesOut, input.beesIn);
}

