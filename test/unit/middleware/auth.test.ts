import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("cross-fetch", () => jest.fn());
jest.mock("../../../src/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    errorEnriched: jest.fn(),
  },
}));

import fetch from "cross-fetch";
import {
  authenticateApiToken,
  validateApiToken,
} from "../../../src/middleware/auth";

const mockedFetch = fetch as unknown as any;

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
}

describe("auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts test bypass header", async () => {
    const req: any = { headers: { "x-test-auth-bypass": "true" } };
    const res = createMockResponse();
    const next = jest.fn();

    await authenticateApiToken(req, res, next);

    expect(req.userId).toBe("test-user-id");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header is missing", async () => {
    const req: any = { headers: {} };
    const res = createMockResponse();

    await authenticateApiToken(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      error: "Unauthorized: Missing or invalid authorization header",
    });
  });

  it("returns 401 when bearer token is empty", async () => {
    const req: any = { headers: { authorization: "Bearer " } };
    const res = createMockResponse();

    await authenticateApiToken(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      error: "Unauthorized: Missing or empty token",
    });
  });

  it("accepts built-in test token without external fetch", async () => {
    const req: any = { headers: { authorization: "Bearer test-api-token" } };
    const res = createMockResponse();
    const next = jest.fn();

    await authenticateApiToken(req, res, next);

    expect(req.userId).toBe("test-user-id");
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns 401 when token validation fails", async () => {
    mockedFetch.mockResolvedValue({
      json: async () => ({ data: { validateApiToken: null } }),
    });

    const req: any = { headers: { authorization: "Bearer invalid-token" } };
    const res = createMockResponse();

    await authenticateApiToken(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      error: "Unauthorized: Invalid token",
    });
  });

  it("validateApiToken returns user id when upstream accepts token", async () => {
    mockedFetch.mockResolvedValue({
      json: async () => ({ data: { validateApiToken: { id: "user-42" } } }),
    });

    await expect(validateApiToken("token-42")).resolves.toBe("user-42");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("validateApiToken returns null on fetch failure", async () => {
    mockedFetch.mockRejectedValue(new Error("network error"));
    await expect(validateApiToken("token-42")).resolves.toBeNull();
  });
});
