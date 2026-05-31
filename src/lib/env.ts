type SetupStatus = {
  databaseReady: boolean;
  authReady: boolean;
  blobReady: boolean;
  aiReady: boolean;
  missingVariables: string[];
};

export const appSetup: SetupStatus = {
  databaseReady: Boolean(process.env.DATABASE_URL),
  authReady: Boolean(
    process.env.DATABASE_URL &&
      process.env.NEXTAUTH_SECRET &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
  ),
  blobReady: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  aiReady: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
  missingVariables: [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.NEXTAUTH_SECRET && "NEXTAUTH_SECRET",
    !process.env.GOOGLE_CLIENT_ID && "GOOGLE_CLIENT_ID",
    !process.env.GOOGLE_CLIENT_SECRET && "GOOGLE_CLIENT_SECRET",
    !process.env.BLOB_READ_WRITE_TOKEN && "BLOB_READ_WRITE_TOKEN",
    !process.env.GEMINI_API_KEY && "GEMINI_API_KEY",
    !process.env.GEMINI_MODEL && "GEMINI_MODEL",
  ].filter(Boolean) as string[],
};

export function getRequiredEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
