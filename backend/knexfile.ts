import type { Knex } from "knex";

const config: Record<string, Knex.Config> = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL ?? {
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT) ?? 5432,
      user: process.env.POSTGRES_USER ?? "app",
      password: process.env.POSTGRES_PASSWORD ?? "secret",
      database: process.env.POSTGRES_DB ?? "app_dev",
    },
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
    pool: { min: 2, max: 10 },
  },

  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: "./migrations",
      extension: "ts",
    },
    pool: { min: 2, max: 20 },
  },
};

export default config;
