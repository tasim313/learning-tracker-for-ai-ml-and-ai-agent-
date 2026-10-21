export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Build workers are ephemeral and cannot access the production data disk.
  // Initialize the configured account only when the application server starts.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { initializeConfiguredSuperuser } = await import("@/lib/auth/service");
  await initializeConfiguredSuperuser();
}
