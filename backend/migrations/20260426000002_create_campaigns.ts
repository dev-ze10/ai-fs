import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sent');
  `);

  await knex.schema.createTable("campaigns", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    t.string("name", 255).notNullable();
    t.string("subject", 255).notNullable();
    t.text("body").notNullable();
    t.specificType("status", "campaign_status").notNullable().defaultTo("draft");
    t.timestamp("scheduled_at", { useTz: true });
    t.uuid("created_by").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.timestamps(true, true);

    t.index("created_by");
    t.index("status");
    t.index("scheduled_at");
  });

  await knex.raw(`
    CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("campaigns");
  await knex.raw("DROP TYPE IF EXISTS campaign_status");
}
