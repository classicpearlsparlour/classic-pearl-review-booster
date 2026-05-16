# QR AI Review Booster MVP

A compliance-first SaaS MVP for helping businesses collect genuine Google reviews from QR scans.

## What is included

- Business profile creation
- Services and keyword groups
- QR code generation per business
- Mobile customer review flow
- AI-assisted review suggestions for positive/neutral experiences
- Internal complaint capture for unhappy experiences
- Google review link redirect tracking
- Basic analytics dashboard
- Complaint status management

## Compliance boundaries

- The app does not create fake reviews.
- The app does not auto-submit Google reviews.
- Customers must choose, edit, and manually post their own review.
- Unhappy customers can still access a public review option after feedback submission.
- AI suggestions are generated only from the customer-selected service, experience, and optional feedback.

## Project structure

```text
client/                 React frontend
server/                 Express API
server/src/models       MongoDB/Mongoose schemas
server/src/routes       API route modules
server/src/services     AI, QR, analytics helpers
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Start MongoDB locally or set `MONGODB_URI` to a hosted MongoDB database.

For quick local validation without MongoDB, set:

```bash
DATA_MODE=memory
```

Memory mode is for demos only and resets when the API server restarts.

4. Optional: add `OPENAI_API_KEY` to `server/.env`. Without it, the server uses the built-in smart salon review generator.

For a free/open-model provider such as Groq or OpenRouter, use OpenAI-compatible settings instead:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.groq.com/openai/v1
OPENAI_COMPATIBLE_API_KEY=your_free_provider_key
OPENAI_COMPATIBLE_MODEL=llama-3.1-8b-instant
```

5. Run both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

## Production deployment

Use this setup for a real live MVP:

- Frontend: Vercel
- Backend API: Render or Railway
- Database: Supabase or MongoDB Atlas
- AI generation: OpenAI API

### Backend environment variables

Set these on Render/Railway:

```bash
NODE_ENV=production
DATA_MODE=supabase
PORT=10000
CLIENT_ORIGIN=https://classic-pearl-review-booster-client.vercel.app
PUBLIC_APP_URL=https://classic-pearl-review-booster-client.vercel.app
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=
OPENAI_COMPATIBLE_BASE_URL=https://api.groq.com/openai/v1
OPENAI_COMPATIBLE_API_KEY=your-free-provider-key
OPENAI_COMPATIBLE_MODEL=llama-3.1-8b-instant
```

`CLIENT_ORIGIN` controls which frontend can call the API.

`PUBLIC_APP_URL` controls the URL encoded inside generated QR codes. If Render still has the temporary value, production code falls back to `https://classic-pearl-review-booster-client.vercel.app`.

For Supabase, run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor first. Use the service role key only in the backend host, never in frontend Vercel variables.

For Classic Pearls, after the schema is created, run [supabase/seed-classic-pearls.sql](supabase/seed-classic-pearls.sql) once to add the salon profile and service list.

### Frontend environment variables

Set this on Vercel:

```bash
VITE_API_URL=https://your-backend-domain.onrender.com
```

### Deployment order

1. Create Supabase tables by running `supabase/schema.sql`.
2. Deploy the backend to Render/Railway with the backend environment variables.
3. Deploy the frontend to Vercel with `VITE_API_URL` set to the backend URL.
4. Update backend `CLIENT_ORIGIN` and `PUBLIC_APP_URL` to the final Vercel URL.
5. Create a business in the live admin dashboard.
6. Print or share the generated QR code.

Production should use `DATA_MODE=supabase` or `DATA_MODE=mongodb`. The local `memory` mode is only for demos and resets after server restart.

## Core API routes

- `POST /api/businesses`
- `GET /api/businesses`
- `GET /api/businesses/:id`
- `GET /api/businesses/:id/qr`
- `POST /api/scans`
- `POST /api/reviews/suggestions`
- `POST /api/reviews/google-click`
- `POST /api/complaints`
- `PATCH /api/complaints/:id`
- `GET /api/analytics/:businessId`
