import { db, json, validEmail, type Env } from "../_shared";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json<{ email?: unknown }>();
    if (!validEmail(body.email)) return json({ error: "A valid email is required" }, 400);
    const sql = db(env);
    await sql`
      INSERT INTO newsletter_subscribers (email)
      VALUES (${body.email.toLowerCase()})
      ON CONFLICT (email) DO UPDATE SET status = 'active', updated_at = now()
    `;
    return json({ ok: true }, 201);
  } catch (error) {
    console.error("newsletter.subscribe", error);
    return json({ error: "Unable to subscribe" }, 500);
  }
};
