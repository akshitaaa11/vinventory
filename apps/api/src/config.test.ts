import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

const validEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:password@localhost:5432/vinventory_test",
  API_HOST: "127.0.0.1",
  API_PORT: "3001",
  WEB_ORIGIN: "http://localhost:5173",
  COOKIE_SECRET: "a-cookie-secret-with-more-than-32-characters",
  SESSION_TTL_HOURS: "8",
  VAUTH_ISSUER: "http://localhost:3002/api/auth",
  VAUTH_CLIENT_ID: "vinventory-test",
  VAUTH_CLIENT_SECRET: "test-secret",
  VAUTH_REDIRECT_URI: "http://localhost:3001/auth/callback",
} satisfies NodeJS.ProcessEnv;

describe("configuration", () => {
  it("loads an explicit test configuration", () => {
    const config = loadConfig(validEnvironment);

    expect(config.environment).toBe("test");
    expect(config.apiPort).toBe(3001);
    expect(config.sessionTtlHours).toBe(8);
    expect(config.vAuth.allowInsecureRequests).toBe(true);
  });

  it("requires HTTPS for the production identity provider", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, NODE_ENV: "production" }),
    ).toThrow("VAUTH_ISSUER must use HTTPS in production");
  });

  it("rejects short cookie secrets", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, COOKIE_SECRET: "too-short" }),
    ).toThrow();
  });
});
