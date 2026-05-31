# KnowYourCalories

KnowYourCalories is a mobile-first calorie tracker built with Next.js App Router. The product goal is simple: let real users log meals quickly from their phone, keep their calorie history durable in Postgres, and use AI as a helpful estimate layer without letting AI become the source of truth.

This repo is set up for a solo developer workflow in VS Code with Codex: ship quickly, keep the app web-first, and make sure the same codebase works on Vercel, as an installable PWA, and later inside an Android Trusted Web Activity.

## Project Overview

KnowYourCalories currently supports:

- Google sign-in with account-scoped data
- Onboarding with daily calorie target and goal type
- Food photo upload to Vercel Blob
- Gemini-powered meal estimation
- Manual item edits and calorie corrections
- Follow-up AI corrections with audit history
- Daily dashboard totals and a 7-day Recharts trend chart
- History, settings, PWA install, and Android TWA prep

Core product rule:

- Daily totals always use `food_entries.final_total_kcal`
- Raw AI totals are never used as the dashboard source of truth

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Drizzle ORM
- Neon Postgres
- Auth.js / NextAuth with Google OAuth
- Vercel Blob
- Gemini API
- Recharts
- PWA service worker support

## Solo Developer Workflow

This repo is friendly to a practical VS Code + Codex loop:

1. Open the folder in VS Code.
2. Keep the integrated terminal open.
3. Copy `.env.example` to `.env.local`.
4. Run the app locally.
5. Use Codex to make focused changes, then immediately run lint and build.

Recommended commands:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
```

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create local environment variables

Copy `.env.example` to `.env.local`.

On macOS/Linux:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Then fill in real values.

### 3. Run database migrations

```bash
pnpm db:migrate
```

> **Windows note:** `drizzle-kit` does not read `.env.local` — it only reads `.env`. Create a `.env` file (not `.env.local`) with at minimum `DATABASE_URL` set, or the migration will fail with a missing URL error. Both `.env` and `.env.local` are gitignored.

### 4. Start the app

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Environment Variables

This app expects the following environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string used by Drizzle and the app |
| `NEXTAUTH_URL` | Yes for stable OAuth setups | Base app URL, especially useful for local auth callbacks |
| `NEXTAUTH_SECRET` | Yes | Auth.js / NextAuth secret for signing sessions |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `BLOB_READ_WRITE_TOKEN` | Yes for photo uploads | Vercel Blob token for image upload/delete |
| `GEMINI_API_KEY` | Yes for AI analysis | Server-side Gemini API key |
| `GEMINI_MODEL` | Yes for AI analysis | Configurable Gemini model name |
| `NEXT_PUBLIC_APP_NAME` | Recommended | Public app name used by the client |

Current example file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/knowyourcalories?sslmode=require
NEXTAUTH_URL=http://localhost:3000

# Auth.js / NextAuth secret equivalent
NEXTAUTH_SECRET=replace-with-a-long-random-secret

GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

NEXT_PUBLIC_APP_NAME=KnowYourCalories
```

## Database Migrations

Drizzle config lives in [drizzle.config.ts](drizzle.config.ts) and uses `DATABASE_URL`.

Useful commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Typical flow:

1. Update `src/lib/db/schema.ts`
2. Generate a migration:

```bash
pnpm db:generate
```

3. Apply migrations:

```bash
pnpm db:migrate
```

For the first production launch, run migrations before inviting users.

## Neon Setup

1. Create a Neon project.
2. Create or use the default database.
3. Copy the connection string.
4. Make sure it includes `sslmode=require`.
5. Set it as `DATABASE_URL` locally and in Vercel.
6. Run `pnpm db:migrate` against that database.

Practical note:

- Keep one stable production database for real users.
- Use separate Neon branches or separate projects for experiments and staging.

## Vercel Blob Setup

KnowYourCalories stores meal image binaries in Vercel Blob. Postgres only stores image URLs and metadata.

1. Create or attach a Vercel Blob store to the project.
2. Add `BLOB_READ_WRITE_TOKEN` to local env and Vercel env.
3. Redeploy if you add the token after the first deployment.

Current implementation note:

- Uploads are stored using public Blob URLs because the app writes images with `access: "public"`.
- If you need stricter image privacy later, move to private Blob delivery and signed server-side reads before wider release.

## Google OAuth Setup

1. Create a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth client for a web application.
4. Add these redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-production-domain/api/auth/callback/google`
5. Copy the client ID and client secret into:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
6. Set `NEXTAUTH_SECRET`.
7. Set `NEXTAUTH_URL` for local development and production environments.

Important:

- All auth secrets stay server-side.
- Do not expose OAuth secrets to the browser.

## Gemini API Setup

1. Create a Gemini API key in Google AI Studio.
2. Set `GEMINI_API_KEY`.
3. Set `GEMINI_MODEL`, for example:
   - `gemini-2.5-flash`
4. Redeploy after adding the variables.

Current behavior:

- Gemini is only called server-side
- Prompt version is stored on `food_entries.ai_prompt_version`
- Raw structured AI output is stored on `food_entries.ai_raw_json`
- AI itemization is copied into `food_items`
- User edits remain separate from the original AI estimate

## Vercel Deployment

Production app is live at:

- https://know-your-calories.vercel.app (permanent domain)
- https://know-your-calories-fu0r80pp0-jhuochen-9211s-projects.vercel.app (deployment-specific)

Recommended production flow:

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Add all environment variables from `.env.example`.
4. Connect the project to your production domain.
5. Run database migrations against production before launch.
6. Redeploy if you change env vars.
7. Smoke test sign-in, onboarding, upload, dashboard, history, settings, and PWA install.

Useful production checklist:

- `DATABASE_URL` points at production Neon
- `NEXTAUTH_SECRET` is set
- Google OAuth callback includes the production domain
- `BLOB_READ_WRITE_TOKEN` is set
- `GEMINI_API_KEY` and `GEMINI_MODEL` are set
- The PWA manifest loads on the live domain

## PWA Install Instructions

KnowYourCalories is web-first and installable as a PWA.

### On Android Chrome

1. Open the live site.
2. Sign in.
3. Use the in-app install button if the browser exposes the install prompt.
4. If not, open the browser menu and choose Install app or Add to Home screen.

### On Samsung Internet

1. Open the live site.
2. If no in-app install prompt appears, open the browser menu.
3. Choose the browser install/add-to-home-screen action.

Expected manifest branding:

- `name`: `KnowYourCalories`
- `short_name`: `KYC`
- `display`: `standalone`

## Android APK / TWA Future Packaging

This app is intentionally kept web-first.

- The main product should keep running from Vercel
- The Android APK/AAB should be a thin wrapper around the live PWA
- No separate Android-only calorie logic should be introduced

For future packaging details, see:

- [docs/android-twa.md](docs/android-twa.md)

That guide covers:

- Bubblewrap setup
- `assetlinks.json`
- APK/App Bundle generation
- Samsung Android testing

## Data Privacy Notes

Be honest with yourself and your users about what is stored where.

### Stored in Postgres

- User record from Google sign-in
- Calorie targets and target history
- Food entries
- Final calorie totals
- AI totals and raw AI JSON
- Food item breakdowns
- Follow-up correction history
- Image URL and metadata only

### Stored in Vercel Blob

- Uploaded meal photo binaries

### Sent to Gemini

- The meal photo
- Meal metadata like meal type and notes
- Existing item breakdowns
- Follow-up correction prompts

### Important current privacy caveat

- Meal photos are currently uploaded to public Vercel Blob URLs
- That is acceptable for a fast MVP only if you are comfortable with the tradeoff
- If you need stronger privacy guarantees, switch to private Blob delivery before scaling usage

## Known Limitations Of AI Calorie Estimation

AI calorie estimation is helpful, but it is not exact.

Limitations to expect:

- Hidden ingredients can be missed
- Sauces, oils, dressings, and butter are easy to underestimate
- Portion size is often approximate
- Packaged foods still need label checks if accuracy matters
- Drinks with syrups or alcohol can be misestimated
- The AI sees the image, not the actual gram weight
- The app returns a best estimate, not a lab-grade result

This app should be presented as:

- a practical tracking tool
- not medical advice
- not nutrition counseling
- not a clinical calorie measurement tool

## Reliability Notes

The MVP is designed so calorie data is not lost when AI fails.

Current behavior:

- Photo entries are created in Postgres before AI analysis completes
- If AI analysis fails, the entry remains saved and can be reviewed manually
- Follow-up corrections do not overwrite live data until accepted or manually saved
- Dashboard totals and 7-day chart totals use `final_total_kcal`

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Suggested Pre-Launch Smoke Test

Before sharing with two real users, test:

- Google sign-in
- Onboarding
- Food photo upload
- AI analysis
- Manual correction
- Follow-up correction
- Dashboard totals
- 7-day chart
- History page
- Settings changes
- Android PWA install

There is already a detailed checklist here:

- [docs/mvp-launch-checklist.md](docs/mvp-launch-checklist.md)

## MVP Roadmap

Short-term MVP goals:

- Make the current two-user launch stable
- Improve photo privacy
- Add more automated testing
- Improve install guidance on Android browsers
- Add export/backup support

Next likely product steps:

- Better onboarding and first-run education
- Richer daily/weekly trends
- Nutrition fields beyond calories
- Shared meal templates or saved foods
- Smarter retry/recovery tooling for uploads and AI jobs
- More explicit admin/debug screens for solo operations

## Project Structure

Useful files and folders:

- `src/app` - App Router pages, layouts, manifest, server actions
- `src/components/app` - Product UI components
- `src/lib/db` - Drizzle schema and DB access
- `src/lib/ai` - Gemini integration
- `drizzle/` - SQL migrations
- `docs/` - TWA and launch checklists

## References

Official docs used for setup and future packaging:

- Vercel deployment: https://vercel.com/docs/deployments/overview
- Vercel Blob: https://vercel.com/docs/vercel-blob
- Vercel Blob SDK: https://vercel.com/docs/vercel-blob/using-blob-sdk
- Auth.js: https://authjs.dev/
- Google OAuth consent setup: https://developers.google.com/workspace/guides/configure-oauth-consent
- Google Sign-In for web setup: https://developers.google.com/identity/oauth2/web/guides/load-3p-authorization-library
- Gemini API quickstart: https://ai.google.dev/gemini-api/docs/quickstart
- Gemini API overview: https://ai.google.dev/gemini-api/docs/api-overview
- Bubblewrap / TWA quick start: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- Android Digital Asset Links: https://developer.android.com/training/app-links/configure-assetlinks
