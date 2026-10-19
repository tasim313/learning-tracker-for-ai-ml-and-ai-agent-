/**
 * Outgoing email. Providers:
 * - "resend": Resend HTTP API (requires RESEND_API_KEY and EMAIL_FROM).
 * - "console": prints messages to the server log; intended for local development.
 * - "none": email is disabled; verification and self-service reset links cannot be delivered.
 * Default: "console" outside production, "none" in production.
 */
export type MailMessage = { to: string; subject: string; text: string };
export type MailProvider = "resend" | "console" | "none";

const outbox: MailMessage[] = [];

export function mailProvider(): MailProvider {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (configured === "resend" || configured === "console" || configured === "none") return configured;
  return process.env.NODE_ENV === "production" ? "none" : "console";
}

export function emailDeliveryAvailable(): boolean {
  const provider = mailProvider();
  if (provider === "resend") return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return provider === "console";
}

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean }> {
  const provider = mailProvider();
  if (provider === "console") {
    outbox.push(message);
    if (outbox.length > 50) outbox.shift();
    if (process.env.NODE_ENV !== "test") {
      console.info(`[email:console] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    }
    return { delivered: true };
  }
  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      console.error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM.");
      return { delivered: false };
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) {
        console.error(`Email provider rejected the message (HTTP ${response.status}).`);
        return { delivered: false };
      }
      return { delivered: true };
    } catch (error) {
      console.error("Email delivery failed.", error);
      return { delivered: false };
    }
  }
  return { delivered: false };
}

/** Messages captured by the console provider (development and automated tests only). */
export function consoleOutbox(): readonly MailMessage[] {
  return outbox;
}
