\# FanPass — Claude Project Context



\## 1. Project overview



FanPass is a fan engagement platform for sports clubs.



The app has two main spaces:



\- Club admin area: used by the club to manage matches, rewards, fans, surveys, sponsors, notifications and live match activations.

\- Fan area: used by supporters to scan QR codes, earn points, redeem rewards, answer surveys, view sponsors and make predictions.



The goal is to build a scalable, clean and simple platform that clubs can use during match days and outside match days.



\---



\## 2. Tech stack



\- Next.js App Router

\- TypeScript

\- Supabase for authentication and database

\- Tailwind CSS

\- API routes in `src/app/api`

\- Local development on `localhost:3000`



\---



\## 3. Main folder structure



\- `src/app`  

&#x20; Main Next.js app structure.



\- `src/app/(club)`  

&#x20; Club/admin-facing pages.



\- `src/app/(fan)`  

&#x20; Fan-facing pages.



\- `src/app/api`  

&#x20; Server-side API routes.



\- `src/components`  

&#x20; Reusable components.



\- `src/lib`  

&#x20; Shared logic and helpers.



\- `src/types`  

&#x20; TypeScript types, especially database types.



\- `supabase`  

&#x20; Supabase schema and database-related files.



\---



\## 4. Key product areas



\### Club side



The club should be able to:



\- Create and manage matches.

\- Open a live match dashboard.

\- Trigger fan activations during a match.

\- Manage rewards.

\- Manage sponsors.

\- View fan data and engagement.

\- Send notifications.

\- Manage surveys.



\### Fan side



The fan should be able to:



\- Sign up and log in.

\- Scan QR codes.

\- Earn points.

\- View their points and ranking.

\- Answer surveys.

\- See sponsor activations.

\- Redeem rewards.

\- Make match predictions.



\---



\## 5. Current routing logic



Respect the current folder structure.



Club routes are under:



\- `src/app/(club)/club/...`



Fan routes are under:



\- `src/app/(fan)/...`



API routes are under:



\- `src/app/api/...`



Important: do not move routes unless explicitly asked.  

Do not create duplicate parallel routes that resolve to the same URL.



\---



\## 6. Supabase rules



Supabase is used for:



\- Auth

\- Database

\- User/fan data

\- Club data

\- Matches

\- Rewards

\- Surveys

\- Predictions

\- QR validation



Important rules:



\- Never expose `SUPABASE\_SERVICE\_ROLE\_KEY` to the client.

\- Service role key must only be used server-side.

\- Client-side code should only use public Supabase keys.

\- Database writes that require admin rights should go through API routes.

\- Keep `.env.local` private and never commit it.



\---



\## 7. Environment variables



Expected local file:



\- `.env.local`



This file is ignored by Git and should not be pushed.



Typical variables:



\- `NEXT\_PUBLIC\_SUPABASE\_URL`

\- `NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY`

\- `SUPABASE\_SERVICE\_ROLE\_KEY`

\- `NEXT\_PUBLIC\_APP\_URL`



Use `.env.example` as the public reference file.



\---



\## 8. Coding rules



Always follow these rules:



\- Use TypeScript.

\- Prefer simple, readable code.

\- Do not add unnecessary dependencies.

\- Keep components modular.

\- Keep server logic inside API routes or server utilities.

\- Keep client components focused on UI and user interaction.

\- Avoid duplicating business logic.

\- Prefer shared helpers in `src/lib` when logic is reused.

\- Explain important changes briefly.



\---



\## 9. UI rules



The UI should feel:



\- Modern

\- Clean

\- Sport/fan oriented

\- Simple enough for club staff to use during live events



When adding UI:



\- Keep consistency between pages.

\- Reuse existing components when possible.

\- Avoid visual clutter.

\- Prioritize clarity over decoration.

\- Make buttons and actions easy to understand.



\---



\## 10. API design rules



API routes should be:



\- Small

\- Clear

\- Secure

\- Easy to debug



Each API route should:



\- Validate the user when needed.

\- Check club/admin permissions when needed.

\- Return clear error messages.

\- Avoid leaking sensitive information.

\- Use Supabase server-side clients correctly.



\---



\## 11. Match live system



The live match system is central.



It should allow the club to:



\- Manage a match in real time.

\- Trigger events or activations.

\- Let fans interact during the match.

\- Connect match activity to points, rewards or fan engagement.



When working on live match features:



\- Be careful with route conflicts.

\- Keep club controls separate from fan views.

\- Avoid breaking existing match APIs.



\---



\## 12. Rewards system



Rewards are part of the engagement loop.



Fans earn points and can redeem rewards.



When working on rewards:



\- Check points before redemption.

\- Prevent invalid or repeated redemption.

\- Keep reward logic secure server-side.

\- Make the fan experience clear.



\---



\## 13. QR code system



QR codes are used for fan check-in or activations.



When working on QR features:



\- Validate QR codes server-side.

\- Avoid trusting client input.

\- Handle already-used or invalid QR codes clearly.

\- Connect successful scans to points or engagement when relevant.



\---



\## 14. Predictions / pronostics



Fans can make predictions linked to matches.



When working on predictions:



\- Prevent duplicate predictions if needed.

\- Validate match status.

\- Keep scoring logic clear.

\- Make forms simple for fans.



\---



\## 15. Database and types



Database-related files:



\- `supabase/schema.sql`

\- `src/types/database.ts`



When changing database structure:



\- Update schema.

\- Update TypeScript types if needed.

\- Keep naming consistent.

\- Prefer clear table and column names.



\---



\## 16. Security principles



Always prioritize:



\- No secrets in client code.

\- No secrets in GitHub.

\- Server-side validation.

\- Permission checks for club/admin actions.

\- Clear separation between fan and club capabilities.



\---



\## 17. Git workflow



After meaningful changes:



```bash

git add .

git commit -m "clear message"

git push

