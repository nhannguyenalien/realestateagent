# Estatein

Figma-inspired real-estate landing page built with a statically exported Next.js frontend, Cloudflare Pages Functions API, and Neon Postgres.

## Local development

```bash
npm install
npm run dev
```

The normal Next.js dev server uses built-in fallback property data. To run the Pages Functions too:

```bash
npm run build
npx wrangler pages dev out --binding DATABASE_URL="postgresql://..."
```

## Database

Create a Neon project/database, then run `db/schema.sql` followed by `db/seed.sql` in the Neon SQL editor. Add the pooled connection string as a Cloudflare Pages secret named `DATABASE_URL`.

## Deploy

Connect the repository to Cloudflare Pages and use `npm run build` as the build command with `out` as the output directory. The `functions` directory is deployed as Pages Functions automatically.
