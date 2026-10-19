import { randomUUID } from "node:crypto";
import type { DocumentDefinition } from "@/lib/storage/document";
import { readDocument, updateDocument } from "@/lib/storage/document";
import { resolveDataPath } from "@/lib/storage/file-store";
import {
  accountsDocumentSchema, auditDocumentSchema, sessionsDocumentSchema, tokensDocumentSchema,
  type AccountsDocument, type AuditDocument, type AuditEntry, type SessionsDocument, type TokensDocument
} from "@/lib/auth/schemas";

/**
 * System documents live in DATA_DIR/system and are never served over HTTP.
 * They contain only password hashes and SHA-256 hashes of session/one-time tokens.
 */

function systemDocument<T>(name: string, schema: { parse: (value: unknown) => T }, empty: () => T): DocumentDefinition<T> {
  return {
    filePath: resolveDataPath("system", name),
    parse: (raw) => ({ data: schema.parse(raw), migrated: false }),
    create: empty,
    validate: (data) => schema.parse(data)
  };
}

export const accountsStore = () => systemDocument<AccountsDocument>("accounts.json", accountsDocumentSchema, () => ({ schemaVersion: 1, users: [] }));
export const sessionsStore = () => systemDocument<SessionsDocument>("sessions.json", sessionsDocumentSchema, () => ({ schemaVersion: 1, sessions: [] }));
export const tokensStore = () => systemDocument<TokensDocument>("auth-tokens.json", tokensDocumentSchema, () => ({ schemaVersion: 1, tokens: [] }));
export const auditStore = () => systemDocument<AuditDocument>("audit-log.json", auditDocumentSchema, () => ({ schemaVersion: 1, entries: [] }));

const auditRetention = 20_000;

export async function recordAudit(entry: Omit<AuditEntry, "id" | "at"> & { at?: string }): Promise<void> {
  await updateDocument(auditStore(), (document) => {
    const entries = [...document.entries, { ...entry, id: randomUUID(), at: entry.at ?? new Date().toISOString() }];
    return { data: { ...document, entries: entries.slice(-auditRetention) }, result: undefined };
  });
}

export async function readAudit(limit = 200): Promise<AuditEntry[]> {
  const document = await readDocument(auditStore());
  return document.entries.slice(-limit).reverse();
}
