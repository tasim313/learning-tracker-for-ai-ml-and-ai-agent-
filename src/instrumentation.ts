export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { initializeConfiguredSuperuser } = await import("@/lib/auth/service");
  await initializeConfiguredSuperuser();
}
