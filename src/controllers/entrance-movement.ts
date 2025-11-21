import {writeEntranceMovementToMySQL} from "../models/mysql";
import {errorCodes, TelemetryServerError} from "../error";

export async function addEntranceMovement(input) {
    const movements = Array.isArray(input) ? input : [input];

    if (movements.length === 0) {
        throw new TelemetryServerError("Bad Request: no movements provided", errorCodes.fieldsMissing, 400);
    }

    for (const movement of movements) {
        if (!movement.hiveId) {
            throw new TelemetryServerError("Bad Request: hiveId not provided", errorCodes.hiveIdMissing, 400);
        }
        if (!movement.boxId) {
            throw new TelemetryServerError("Bad Request: boxId not provided", errorCodes.boxIdMissing, 400);
        }

        if (movement.beesOut == null || movement.beesIn == null) {
            throw new TelemetryServerError("Bad Request: beesOut or beesIn are not provided", errorCodes.fieldsMissing, 400);
        }

        if (movement.beesOut < 0 || movement.beesIn < 0) {
            throw new TelemetryServerError("Bad Request: beesOut or beesIn cannot be negative", errorCodes.positiveValuesOnly, 400);
        }

        const timestamp = movement.timestamp ? new Date(movement.timestamp * 1000) : new Date();

        await writeEntranceMovementToMySQL(
            movement.hiveId,
            movement.boxId,
            movement.beesOut,
            movement.beesIn,
            movement.netFlow,
            movement.avgSpeed,
            movement.p95Speed,
            movement.stationaryBees,
            movement.detectedBees,
            movement.beeInteractions,
            timestamp
        );
    }
}
