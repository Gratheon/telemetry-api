import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/models/postgres", () => ({
  writeEntranceMovementToPostgres: jest.fn(),
  writeBatchEntranceMovementToPostgres: jest.fn(),
}));

import {
  writeBatchEntranceMovementToPostgres,
  writeEntranceMovementToPostgres,
} from "../../../src/models/postgres";
import { addEntranceMovement } from "../../../src/controllers/entrance-movement";
import { TelemetryServerError, errorCodes } from "../../../src/error";

describe("addEntranceMovement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when empty array is provided", async () => {
    await expect(addEntranceMovement([])).rejects.toMatchObject({
      errorCode: errorCodes.fieldsMissing,
      httpStatus: 400,
    } satisfies Partial<TelemetryServerError>);
  });

  it("throws when boxId is missing", async () => {
    await expect(
      addEntranceMovement({
        hiveId: "hive-1",
        beesOut: 10,
        beesIn: 9,
      }),
    ).rejects.toMatchObject({
      errorCode: errorCodes.boxIdMissing,
      httpStatus: 400,
    } satisfies Partial<TelemetryServerError>);
  });

  it("throws when counts are negative", async () => {
    await expect(
      addEntranceMovement({
        hiveId: "hive-1",
        boxId: "box-1",
        beesOut: -1,
        beesIn: 9,
      }),
    ).rejects.toMatchObject({
      errorCode: errorCodes.positiveValuesOnly,
      httpStatus: 400,
    } satisfies Partial<TelemetryServerError>);
  });

  it("writes a single movement with parsed timestamp", async () => {
    await addEntranceMovement({
      hiveId: "hive-1",
      boxId: "box-1",
      beesOut: 12,
      beesIn: 10,
      timestamp: 1704067200,
    });

    expect(writeBatchEntranceMovementToPostgres).not.toHaveBeenCalled();
    expect(writeEntranceMovementToPostgres).toHaveBeenCalledWith(
      "hive-1",
      "box-1",
      12,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Date(1704067200 * 1000),
    );
  });

  it("writes multiple movements using batch insert", async () => {
    await addEntranceMovement([
      {
        hiveId: "hive-1",
        boxId: "box-1",
        beesOut: 7,
        beesIn: 6,
      },
      {
        hiveId: "hive-2",
        boxId: "box-2",
        beesOut: 11,
        beesIn: 10,
        timestamp: 1704067200,
      },
    ]);

    expect(writeEntranceMovementToPostgres).not.toHaveBeenCalled();
    expect(writeBatchEntranceMovementToPostgres).toHaveBeenCalledTimes(1);
    const [batchPayload] = (writeBatchEntranceMovementToPostgres as jest.Mock).mock
      .calls[0];
    expect(batchPayload).toHaveLength(2);
    expect(batchPayload[0]).toMatchObject({
      hiveId: "hive-1",
      boxId: "box-1",
      beesOut: 7,
      beesIn: 6,
    });
    expect(batchPayload[0].timestamp).toBeInstanceOf(Date);
    expect(batchPayload[1].timestamp).toEqual(new Date(1704067200 * 1000));
  });
});
