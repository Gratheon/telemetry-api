import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/models/postgres", () => ({
  writeBeehiveMetricsToPostgres: jest.fn(),
  writeBatchBeehiveMetricsToPostgres: jest.fn(),
}));

import {
  writeBatchBeehiveMetricsToPostgres,
  writeBeehiveMetricsToPostgres,
} from "../../../src/models/postgres";
import { addIoTMetrics } from "../../../src/controllers/iot-metrics";
import { TelemetryServerError, errorCodes } from "../../../src/error";

describe("addIoTMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when empty array is provided", async () => {
    await expect(addIoTMetrics([])).rejects.toMatchObject({
      name: "TelemetryServerError",
      errorCode: errorCodes.fieldsMissing,
      httpStatus: 400,
    } satisfies Partial<TelemetryServerError>);
  });

  it("throws when hiveId is missing", async () => {
    await expect(
      addIoTMetrics({
        fields: { temperatureCelsius: 22 },
      }),
    ).rejects.toMatchObject({
      errorCode: errorCodes.hiveIdMissing,
      httpStatus: 400,
    } satisfies Partial<TelemetryServerError>);
  });

  it("throws when fields are missing", async () => {
    await expect(
      addIoTMetrics({
        hiveId: "hive-1",
        fields: {},
      }),
    ).rejects.toMatchObject({
      errorCode: errorCodes.fieldsMissing,
      httpStatus: 400,
    } satisfies Partial<TelemetryServerError>);
  });

  it("writes a single metric with parsed timestamp", async () => {
    await addIoTMetrics({
      hiveId: "hive-1",
      fields: { humidityPercent: 55 },
      timestamp: 1704067200,
    });

    expect(writeBeehiveMetricsToPostgres).toHaveBeenCalledTimes(1);
    expect(writeBatchBeehiveMetricsToPostgres).not.toHaveBeenCalled();
    expect(writeBeehiveMetricsToPostgres).toHaveBeenCalledWith(
      "hive-1",
      { humidityPercent: 55 },
      new Date(1704067200 * 1000),
    );
  });

  it("writes multiple metrics using batch insert", async () => {
    await addIoTMetrics([
      {
        hiveId: "hive-1",
        fields: { temperatureCelsius: 20 },
      },
      {
        hiveId: "hive-2",
        fields: { weightKg: 30.5 },
        timestamp: 1704067200,
      },
    ]);

    expect(writeBeehiveMetricsToPostgres).not.toHaveBeenCalled();
    expect(writeBatchBeehiveMetricsToPostgres).toHaveBeenCalledTimes(1);
    const [batchPayload] = (writeBatchBeehiveMetricsToPostgres as jest.Mock).mock
      .calls[0];
    expect(batchPayload).toHaveLength(2);
    expect(batchPayload[0]).toMatchObject({
      hiveId: "hive-1",
      fields: { temperatureCelsius: 20 },
    });
    expect(batchPayload[0].timestamp).toBeInstanceOf(Date);
    expect(batchPayload[1]).toMatchObject({
      hiveId: "hive-2",
      fields: { weightKg: 30.5 },
      timestamp: new Date(1704067200 * 1000),
    });
  });
});
