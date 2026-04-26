import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    t.string("email", 255).notNullable().unique();
    t.string("name", 255).notNullable();
    t.string("password_hash", 255).notNullable();
    t.timestamps(true, true);
  });

  await knex.raw(`
    CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
  await knex.raw("DROP FUNCTION IF EXISTS set_updated_at() CASCADE");
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}
