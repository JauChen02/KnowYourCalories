# MVP Launch Checklist

Use this checklist before inviting the first two real users into KnowYourCalories.

## Local Verification Already Covered

These should be re-run after any significant change:

```bash
pnpm lint
pnpm build
```

Local code review checkpoints:

- Dashboard totals are sourced from `food_entries.final_total_kcal`
- Seven-day chart bars are sourced from `food_entries.final_total_kcal`
- Deleted entries are excluded from totals
- AI analysis failure preserves the saved entry instead of deleting it
- Follow-up corrections do not change the live meal until accepted or manually saved

## Production Credentials Needed

Complete these before live user testing:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `NEXT_PUBLIC_APP_NAME=KnowYourCalories`

## Two-User Acceptance Pass

Run this with two separate Google accounts on two separate devices if possible.

### User 1

- Sign in with Google
- Confirm you land on onboarding if no active calorie target exists
- Save a target and goal type
- Confirm redirect to the dashboard
- Upload a meal photo
- Confirm the app saves the pending entry before AI finishes
- Confirm AI analysis opens the verification screen
- Edit at least one item manually
- Confirm the meal
- Check the dashboard total updates using the final saved calories
- Check the seven-day chart reflects the saved final calories
- Open History and confirm the entry appears with the right status
- Change the calorie target in Settings and confirm the dashboard target updates
- Toggle image retention and save it

### User 2

- Sign in with a different Google account
- Confirm User 2 cannot see User 1 data
- Complete onboarding separately
- Upload a different meal photo
- Submit a follow-up correction such as hidden ingredients
- Review the proposed revision
- Accept or reject it
- Confirm only the accepted or manually saved result changes the final total
- Confirm History and Dashboard stay scoped to User 2

## Failure Handling Checks

- Upload a meal photo, then force Gemini analysis to fail by temporarily removing `GEMINI_API_KEY` in a staging environment or using an invalid model
- Confirm the entry remains in History with a clear review state
- Confirm the user can still open the entry and correct it manually
- Confirm no dashboard totals disappear unexpectedly after the failed analysis

## Samsung Android Checks

- Open the live site in Chrome on the Samsung phone
- Open the live site in Samsung Internet on the same phone
- Confirm manifest, icons, and theme colors look correct
- Confirm the install prompt appears when supported
- If no in-app install prompt appears, confirm the browser menu still offers install or add-to-home-screen
- Install the PWA and launch it from the home screen
- Confirm the app opens in standalone mode
- Confirm Google sign-in works inside the installed experience
- Confirm camera capture works from the upload screen
- Confirm gallery upload works from the upload screen
- Confirm dashboard, history, verify, and settings screens remain usable on the Samsung screen size

## Go / No-Go

Launch to the first two users only after all of these are true:

- Sign-in works
- Onboarding works
- Photo upload works
- AI analysis works
- Manual correction works
- Follow-up correction works
- Daily totals match `final_total_kcal`
- Seven-day chart matches `final_total_kcal`
- History is durable after refreshes and failures
- Settings save correctly
- Android install behavior is acceptable on a real Samsung phone
