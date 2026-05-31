import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getDb, schema } from "@/lib/db";
import { appSetup } from "@/lib/env";

const authSecret =
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "knowyourcalories-dev-secret");

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  adapter: appSetup.authReady
    ? DrizzleAdapter(getDb(), {
        usersTable: schema.user,
        accountsTable: schema.account,
        sessionsTable: schema.session,
        verificationTokensTable: schema.verificationToken,
        authenticatorsTable: schema.authenticator,
      })
    : undefined,
  session: {
    strategy: appSetup.authReady ? "database" : "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  providers: appSetup.authReady
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
      ]
    : [],
  callbacks: {
    session: ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
};
