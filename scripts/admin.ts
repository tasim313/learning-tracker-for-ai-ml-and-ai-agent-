/**
 * Operator commands that run on the server (e.g. a Render shell), never over HTTP.
 *
 *   npm run admin -- reset-link <email>            Print a one-hour password reset link
 *   npm run admin -- set-role <email> <admin|learner>
 *   npm run admin -- import-legacy <email> [file]  Import a pre-accounts workspace
 *                                                  (default: $DATA_DIR/learning-tracker.json)
 */
import path from "node:path";
import { readDocument, updateDocument } from "../src/lib/storage/document";
import { dataDirectory } from "../src/lib/storage/file-store";
import { importLegacyWorkspace } from "../src/lib/storage/user-store";
import { accountsStore, recordAudit } from "../src/lib/auth/stores";
import { createPasswordResetLink } from "../src/lib/auth/service";

async function accountByEmail(email: string) {
  const account = (await readDocument(accountsStore())).users.find((user) => user.email === email.trim().toLowerCase());
  if (!account) throw new Error(`No account uses ${email}.`);
  return account;
}

async function main() {
  const [command, email, extra] = process.argv.slice(2);
  if (command === "reset-link" && email) {
    const base = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
    console.log(await createPasswordResetLink(email, base));
    return;
  }
  if (command === "set-role" && email && (extra === "admin" || extra === "learner")) {
    const role: "admin" | "learner" = extra;
    const account = await accountByEmail(email);
    await updateDocument(accountsStore(), (document) => {
      if (role === "learner" && document.users.filter((user) => user.role === "admin").length === 1 && account.role === "admin") {
        throw new Error("At least one administrator must remain.");
      }
      return { data: { ...document, users: document.users.map((user) => user.id === account.id ? { ...user, role, updatedAt: new Date().toISOString() } : user) }, result: undefined };
    });
    await recordAudit({ actorUserId: null, action: "account.role-changed", targetType: "account", targetId: account.id, details: `Role set to ${extra} by operator CLI.` });
    console.log(`Role for ${account.email} set to ${extra}.`);
    return;
  }
  if (command === "import-legacy" && email) {
    const account = await accountByEmail(email);
    const file = path.resolve(extra ?? path.join(dataDirectory(), "learning-tracker.json"));
    await importLegacyWorkspace(account.id, file);
    console.log(`Imported ${file} into ${account.email}. The account's previous data was snapshotted first; the legacy file was not modified.`);
    return;
  }
  console.error("Usage:\n  admin reset-link <email>\n  admin set-role <email> <admin|learner>\n  admin import-legacy <email> [file]");
  process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
