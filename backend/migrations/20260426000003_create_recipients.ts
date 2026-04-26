import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("recipients", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    t.string("email", 255).notNullable().unique();
    t.string("name", 255).notNullable();
    t.timestamps(true, true);
  });

  await knex.raw(`
    CREATE TRIGGER recipients_updated_at
    BEFORE UPDATE ON recipients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("recipients");
}
