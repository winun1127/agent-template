# Agent Template

This is a template for building an agent with Next.js, Convex, Better Auth, and LangChain. It includes authentication, real-time database, serverless functions, and an LLM agent with streaming responses.

## Stack

- **Next.js 16** — React framework (App Router) + React 19
- **Convex** — real-time database & serverless functions
- **Better Auth** — authentication with Convex adapter
- **LangChain + Vercel AI SDK** — LLM agent with streaming

## Setup

```bash
# Set env vars
cp .env.local.example .env.local

# Install deps
npm install

# Run Convex — it will prompt you to choose **cloud** or **local** (beta)
# then add some env vars into `.env.local`
npx convex dev

# In a separate terminal, set the remaining Convex env vars
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3000
```

## Development

```bash
# Run Next.js + Convex in parallel
npm run dev
```

- Next.js App: http://localhost:3000
- Convex (local): http://127.0.0.1:3210
- Convex dashboard: https://dashboard.convex.dev

## Self-Hosted Convex

If you're interested in running Convex on your own infrastructure, check out the [self-hosted setup guide](https://github.com/get-convex/convex-backend/tree/main/self-hosted#readme)
