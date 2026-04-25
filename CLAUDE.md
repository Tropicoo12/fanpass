\# FanPass Project Context



\## Stack

\- Next.js (App Router)

\- TypeScript

\- Supabase (Auth + Database)

\- Tailwind CSS



\## Structure



\### Main folders

\- src/app → pages \& routing

\- src/app/(club) → club admin interface

\- src/app/(fan) → fan interface

\- src/app/api → backend API routes

\- src/components → reusable UI components

\- supabase → database schema \& config



\## Core Features

\- Live match system (real-time updates)

\- QR code scanning (fan check-in)

\- Rewards system

\- Surveys \& fan engagement

\- Notifications

\- Pronostics (predictions)



\## Architecture Rules

\- Keep fan and club logic separated

\- Do not duplicate logic

\- Use reusable components when possible

\- API routes should stay simple and clean



\## Supabase

\- Used for auth + database

\- Service role key used for admin actions

\- All DB operations go through API routes



\## Coding Style

\- Always use TypeScript

\- Prefer simple and readable code

\- Avoid unnecessary complexity

\- Explain important logic briefly



\## Important Constraints

\- Do not break routing structure

\- Respect folder organization

\- Keep UI consistent across fan/club



\## Goal

Build a scalable fan engagement platform for sports clubs

