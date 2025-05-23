import {writeEntranceMovementToMySQL} from "../models/mysql";
import {errorCodes, TelemetryServerError} from "../error";

export async function addEntranceMovement(input) {
    if (!input.hiveId) {
        throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
    }
    if (!input.boxId) {
        throw new TelemetryServerError("Bad Request: boxId not provided", errorCodes.boxIdMissing, 400);
    }

    if (!input.beesOut && !input.beesIn) {
        throw new TelemetryServerError("Bad Request: beesOut or beesIn are not provided", errorCodes.fieldsMissing, 400);
    }

    await writeEntranceMovementToMySQL(input.hiveId, input.boxId, input.beesOut, input.beesIn);
}
