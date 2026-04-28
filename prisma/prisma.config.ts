import { config as dotenv } from "dotenv";
import { join } from "path";

dotenv({ path: join(process.cwd(), ".env") });

import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(DATABASE_URL && {
    datasource: {
      url: DATABASE_URL,
    },
    migrate: {
      adapter: async () => {
        const { PrismaPg } = await import("@prisma/adapter-pg");
        const { Pool } = await import("pg");
        const pool = new Pool({ connectionString: DATABASE_URL });
        return new PrismaPg(pool);
      },
    },
  }),
});
