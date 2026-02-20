import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema.js";

const authToken = process.env["DATABASE_AUTH_TOKEN"];
const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./label-watcher.db",
  ...(authToken !== undefined && { authToken }),
});

export const db = drizzle(client, { schema });
