// De privacyverklaring belooft dat de code van de internetverbinding hoogstens een dag bewaard wordt, ook als er daarna
// geen nieuwe inschrijving of aanmelding meer komt. Op een echte SQLite-database in het geheugen (D1 is SQLite).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { eraseExpired } from "../server/wissen.ts";

const dir = new URL("../migrations/", import.meta.url);

// Genoeg van de D1-interface voor eraseExpired.
function d1(db) {
  const prepare = (sql) => {
    const statement = {
      args: [],
      bind(...args) {
        statement.args = args;
        return statement;
      },
      run: async () => db.prepare(sql).run(...statement.args),
      all: async () => ({ results: db.prepare(sql).all(...statement.args) }),
    };
    return statement;
  };
  return {
    prepare,
    batch: async (statements) => {
      for (const statement of statements) await statement.run();
    },
  };
}

test("de wachtrijronde ruimt misbruiklogboeken ouder dan een dag op, ook zonder nieuwe inschrijving of aanmelding", async () => {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort())
    db.exec(readFileSync(new URL(file, dir), "utf8"));
  const hoursAgo = (hours) => new Date(Date.now() - hours * 3600_000).toISOString();
  const insertSubmit = db.prepare("INSERT INTO submit_log (client_key, created_at) VALUES (?1, ?2)");
  const insertLogin = db.prepare("INSERT INTO login_attempts (client_key, attempted_at) VALUES (?1, ?2)");
  insertSubmit.run("oud", hoursAgo(25));
  insertSubmit.run("recent", hoursAgo(23));
  insertLogin.run("oud", hoursAgo(25));
  insertLogin.run("recent", hoursAgo(23));

  await eraseExpired(d1(db));

  const keys = (table) => db.prepare(`SELECT client_key FROM ${table} ORDER BY client_key`).all().map((row) => row.client_key);
  assert.deepEqual(keys("submit_log"), ["recent"]);
  assert.deepEqual(keys("login_attempts"), ["recent"]);
});
