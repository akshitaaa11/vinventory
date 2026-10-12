import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  WEB_ORIGIN: z.string().url(),
  COOKIE_SECRET: z.string().min(32),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(720).default(12),
  VAUTH_ISSUER: z.string().url(),
  VAUTH_CLIENT_ID: z.string().min(1),
  VAUTH_CLIENT_SECRET: z.string().min(1),
  VAUTH_REDIRECT_URI: z.string().url(),
});

export type AppConfig = {
  environment: z.infer<typeof environmentSchema>["NODE_ENV"];
  databaseUrl: string;
  apiHost: string;
  apiPort: number;
  webOrigin: string;
  cookieSecret: string;
  sessionTtlHours: number;
  vAuth: {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    allowInsecureRequests: boolean;
  };
};

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const parsed = environmentSchema.parse(environment);
  const issuer = new URL(parsed.VAUTH_ISSUER);

  if (parsed.NODE_ENV === "production" && issuer.protocol !== "https:") {
    throw new Error("VAUTH_ISSUER must use HTTPS in production");
  }

  return {
    environment: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    apiHost: parsed.API_HOST,
    apiPort: parsed.API_PORT,
    webOrigin: parsed.WEB_ORIGIN,
    cookieSecret: parsed.COOKIE_SECRET,
    sessionTtlHours: parsed.SESSION_TTL_HOURS,
    vAuth: {
      issuer: parsed.VAUTH_ISSUER,
      clientId: parsed.VAUTH_CLIENT_ID,
      clientSecret: parsed.VAUTH_CLIENT_SECRET,
      redirectUri: parsed.VAUTH_REDIRECT_URI,
      allowInsecureRequests:
        parsed.NODE_ENV !== "production" && issuer.protocol === "http:",
    },
  };
}
