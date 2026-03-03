import { describe, expect, it } from "@jest/globals";
import { TelemetryServerError, errorCodes } from "../../src/error";

describe("TelemetryServerError", () => {
  it("stores message, http status, and error code", () => {
    const err = new TelemetryServerError("bad request", errorCodes.fieldsMissing, 400);

    expect(err.name).toBe("TelemetryServerError");
    expect(err.message).toBe("bad request");
    expect(err.errorCode).toBe(errorCodes.fieldsMissing);
    expect(err.httpStatus).toBe(400);
  });
});
