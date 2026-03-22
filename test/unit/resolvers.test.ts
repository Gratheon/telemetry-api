import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    errorEnriched: jest.fn(),
  },
}));

jest.mock("../../src/controllers/iot-metrics", () => ({
  addIoTMetrics: jest.fn(),
}));

jest.mock("../../src/models/postgres", () => ({
  readMetricsFromPostgres: jest.fn(),
  readAggregatedMetricsFromPostgresForToday: jest.fn(),
  readEntranceMovementFromPostgres: jest.fn(),
  readAggregatedWeightMetricsFromPostgres: jest.fn(),
  readPopulationMetricsFromPostgres: jest.fn(),
  writePopulationMetricsToPostgres: jest.fn(),
}));

import { addIoTMetrics } from "../../src/controllers/iot-metrics";
import {
  readMetricsFromPostgres,
  readPopulationMetricsFromPostgres,
  writePopulationMetricsToPostgres,
} from "../../src/models/postgres";
import { resolvers } from "../../src/resolvers";
import { TelemetryServerError, errorCodes } from "../../src/error";

describe("resolvers", () => {
  const mockReadMetricsFromPostgres = readMetricsFromPostgres as unknown as any;
  const mockReadPopulationMetricsFromPostgres =
    readPopulationMetricsFromPostgres as unknown as any;
  const mockWritePopulationMetricsToPostgres =
    writePopulationMetricsToPostgres as unknown as any;
  const mockAddIoTMetrics = addIoTMetrics as unknown as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns validation error for non-positive timeRangeMin", async () => {
    const result = await resolvers.Query.temperatureCelsius(
      null,
      { hiveId: "hive-1", timeRangeMin: 0 },
      {},
    );

    expect(result).toEqual({
      __typename: "TelemetryError",
      code: errorCodes.invalidTimeRange,
      message: "Time range must be positive",
    });
  });

  it("returns metric list for successful temperature query", async () => {
    mockReadMetricsFromPostgres.mockResolvedValue([
      { t: new Date("2025-01-01T00:00:00.000Z"), v: 21.5 },
    ]);

    const result = await resolvers.Query.temperatureCelsius(
      null,
      { hiveId: "hive-1", timeRangeMin: 15 },
      {},
    );

    expect(readMetricsFromPostgres).toHaveBeenCalledWith(
      "hive-1",
      15,
      "temperatureCelsius",
    );
    expect(result).toMatchObject({
      __typename: "MetricFloatList",
      metrics: [{ v: 21.5 }],
    });
  });

  it("wraps TelemetryServerError in telemetry error response", async () => {
    mockReadMetricsFromPostgres.mockRejectedValue(
      new TelemetryServerError("db failure", errorCodes.fieldsMissing, 400),
    );

    const result = await resolvers.Query.temperatureCelsius(
      null,
      { hiveId: "hive-1", timeRangeMin: 15 },
      {},
    );

    expect(result).toEqual({
      __typename: "TelemetryError",
      code: errorCodes.fieldsMissing,
      message: "db failure",
    });
  });

  it("returns default-days population metrics", async () => {
    mockReadPopulationMetricsFromPostgres.mockResolvedValue([
      { t: new Date("2025-01-01T00:00:00.000Z"), beeCount: 10000 },
    ]);

    const result = await resolvers.Query.populationMetrics(
      null,
      { hiveId: "hive-1" } as any,
      {},
    );

    expect(readPopulationMetricsFromPostgres).toHaveBeenCalledWith("hive-1", 90);
    expect(result).toMatchObject({
      __typename: "PopulationMetricsList",
      metrics: [{ beeCount: 10000 }],
    });
  });

  it("returns validation error for population days over limit", async () => {
    const result = await resolvers.Query.populationMetrics(
      null,
      { hiveId: "hive-1", days: 731 },
      {},
    );

    expect(result).toEqual({
      __typename: "TelemetryError",
      code: errorCodes.invalidTimeRange,
      message: "Days cannot exceed 730",
    });
  });

  it("returns invalid input when addPopulationMetric is missing fields", async () => {
    const result = await resolvers.Mutation.addPopulationMetric(
      null,
      { hiveId: "hive-1", fields: {} } as any,
      { uid: "user-1" },
    );

    expect(result).toEqual({
      __typename: "TelemetryError",
      code: errorCodes.invalidInput,
      message: "Fields are required",
    });
  });

  it("writes population metric and returns OK", async () => {
    mockWritePopulationMetricsToPostgres.mockResolvedValue(undefined);

    const result = await resolvers.Mutation.addPopulationMetric(
      null,
      {
        hiveId: "hive-1",
        fields: { beeCount: 9000 },
        inspectionId: "inspection-1",
        timestamp: "2025-02-01T10:00:00.000Z",
      },
      { uid: "user-1" },
    );

    expect(writePopulationMetricsToPostgres).toHaveBeenCalledWith(
      "hive-1",
      { beeCount: 9000 },
      "inspection-1",
      new Date("2025-02-01T10:00:00.000Z"),
    );
    expect(result).toEqual({
      __typename: "AddMetricMessage",
      message: "OK",
    });
  });

  it("returns internal error on unexpected addMetric failure", async () => {
    mockAddIoTMetrics.mockRejectedValue(new Error("boom"));

    const result = await resolvers.Mutation.addMetric(
      null,
      { hiveId: "hive-1", fields: { temperatureCelsius: 20 } },
      { uid: "user-1" },
    );

    expect(result).toEqual({
      __typename: "TelemetryError",
      code: errorCodes.internalServerError,
      message: "Internal server error",
    });
  });
});
