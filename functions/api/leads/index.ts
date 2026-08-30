import { db, json, validEmail, type Env } from "../_shared";

type LeadBody = { name?: unknown; firstName?: unknown; lastName?: unknown; email?: unknown; phone?: unknown; message?: unknown; propertyId?: unknown };

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json<LeadBody>();
    const name = typeof body.name === "string"
      ? body.name.trim()
      : [body.firstName, body.lastName].filter((part): part is string => typeof part === "string").map((part) => part.trim()).filter(Boolean).join(" ");
    if (name.length < 2 || !validEmail(body.email)) {
      return json({ error: "Name and a valid email are required" }, 400);
    }
    const sql = db(env);
    const rows = await sql`
      INSERT INTO leads (name, email, phone, message, property_id, source)
      VALUES (${name}, ${body.email.toLowerCase()}, ${typeof body.phone === "string" ? body.phone.trim() : null},
              ${typeof body.message === "string" ? body.message.trim() : null},
              ${typeof body.propertyId === "string" ? body.propertyId : null}::uuid, 'website')
      RETURNING id::text
    `;
    return json({ ok: true, id: rows[0].id }, 201);
  } catch (error) {
    console.error("leads.create", error);
    return json({ error: "Unable to save enquiry" }, 500);
  }
};
