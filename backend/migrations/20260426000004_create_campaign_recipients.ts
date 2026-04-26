import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed');
  `);

  await knex.schema.createTable("campaign_recipients", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    t.uuid("campaign_id").notNullable().references("id").inTable("campaigns").onDelete("CASCADE");
    t.uuid("recipient_id").notNullable().references("id").inTable("recipients").onDelete("CASCADE");
    t.specificType("status", "delivery_status").notNullable().defaultTo("pending");
    t.timestamp("sent_at", { useTz: true });
    t.timestamp("opened_at", { useTz: true });
    t.timestamps(true, true);

    t.unique(["campaign_id", "recipient_id"]);
    t.index("status");
    t.index("campaign_id");
    t.index("recipient_id");
  });

  await knex.raw(`
    CREATE TRIGGER campaign_recipients_updated_at
    BEFORE UPDATE ON campaign_recipients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("campaign_recipients");
  await knex.raw("DROP TYPE IF EXISTS delivery_status");
}
