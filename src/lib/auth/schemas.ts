import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.string().datetime();

export const roles = ["learner", "admin", "superuser"] as const;
export type Role = (typeof roles)[number];
export const accountStatuses = ["active", "inactive", "suspended"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

export const passwordSchema = z.string()
  .min(12, "Use at least 12 characters.")
  .max(256, "Use at most 256 characters.");

export const profileSchema = z.object({
  displayName: z.string().trim().max(80).default(""),
  learningGoals: z.string().trim().max(2000).default(""),
  preferredLanguage: z.enum(["en", "bn"]).default("en"),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner")
});
export type Profile = z.infer<typeof profileSchema>;

export const accountSchema = z.object({
  id: uuid,
  email: emailSchema,
  passwordHash: z.string().startsWith("$argon2id$"),
  role: z.enum(roles),
  status: z.enum(accountStatuses).default("active"),
  emailVerifiedAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  passwordChangedAt: timestamp,
  lastLoginAt: timestamp.nullable().default(null),
  lastLogoutAt: timestamp.nullable().default(null),
  failedLoginCount: z.number().int().nonnegative().default(0),
  lockedUntil: timestamp.nullable().default(null),
  profile: profileSchema
});
export type Account = z.infer<typeof accountSchema>;

export const accountsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  users: z.array(accountSchema)
}).superRefine((document, context) => {
  const ids = new Set<string>();
  const emails = new Set<string>();
  document.users.forEach((user, index) => {
    if (ids.has(user.id)) context.addIssue({ code: "custom", path: ["users", index, "id"], message: "Duplicate account id." });
    if (emails.has(user.email)) context.addIssue({ code: "custom", path: ["users", index, "email"], message: "Duplicate account email." });
    ids.add(user.id);
    emails.add(user.email);
  });
});
export type AccountsDocument = z.infer<typeof accountsDocumentSchema>;

export const sessionRecordSchema = z.object({
  id: uuid,
  tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  userId: uuid,
  createdAt: timestamp,
  lastUsedAt: timestamp,
  expiresAt: timestamp,
  endedAt: timestamp.nullable().default(null),
  userAgent: z.string().max(200).default(""),
  activeLearningSeconds: z.number().int().nonnegative().default(0),
  learningActive: z.boolean().default(false),
  currentActivity: z.string().max(250).default(""),
  lastHeartbeatId: uuid.nullable().default(null)
});
export type SessionRecord = z.infer<typeof sessionRecordSchema>;

export const sessionsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(sessionRecordSchema)
});
export type SessionsDocument = z.infer<typeof sessionsDocumentSchema>;

export const tokenPurposes = ["verify-email", "password-reset"] as const;
export const oneTimeTokenSchema = z.object({
  tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  userId: uuid,
  purpose: z.enum(tokenPurposes),
  createdAt: timestamp,
  expiresAt: timestamp,
  usedAt: timestamp.nullable()
});
export type OneTimeToken = z.infer<typeof oneTimeTokenSchema>;

export const tokensDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  tokens: z.array(oneTimeTokenSchema)
});
export type TokensDocument = z.infer<typeof tokensDocumentSchema>;

export const auditEntrySchema = z.object({
  id: uuid,
  at: timestamp,
  actorUserId: uuid.nullable(),
  action: z.string().min(1).max(80),
  targetType: z.string().max(40),
  targetId: z.string().max(120).nullable(),
  details: z.string().max(1000).default("")
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(auditEntrySchema)
});
export type AuditDocument = z.infer<typeof auditDocumentSchema>;

/** The account fields that may leave the server. Never includes the password hash or lockout state. */
export type PublicUser = {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  profile: Profile;
};

export function toPublicUser(account: Account): PublicUser {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    emailVerified: account.emailVerifiedAt !== null,
    createdAt: account.createdAt,
    profile: account.profile
  };
}
