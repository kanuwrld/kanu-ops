import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { seedDemoWorkspace } from "../src/lib/db";

const dbPath = path.join(process.cwd(), "data", "kanu-ops.db");

for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`]) {
  if (existsSync(file)) rmSync(file);
}

seedDemoWorkspace();
console.log("Reset local Kanu Ops SQLite database.");
