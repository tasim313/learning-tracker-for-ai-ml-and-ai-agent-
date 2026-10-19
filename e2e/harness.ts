import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Runs the production build (`next start`) against a throwaway DATA_DIR. */
export class TestServer {
  readonly port = 3900 + Math.floor(Math.random() * 90);
  readonly origin = `http://localhost:${this.port}`;
  dataDir = "";
  private process: ChildProcess | null = null;

  async start() {
    if (!this.dataDir) this.dataDir = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-e2e-"));
    this.process = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(this.port)], {
      env: { ...process.env, NODE_ENV: "production", DATA_DIR: this.dataDir, COOKIE_SECURE: "false", ADMIN_EMAILS: "admin@example.test", EMAIL_PROVIDER: "none" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let log = "";
    this.process.stdout?.on("data", (chunk) => { log += String(chunk); });
    this.process.stderr?.on("data", (chunk) => { log += String(chunk); });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        if ((await fetch(`${this.origin}/api/health`)).ok) return;
      } catch {
        // not listening yet
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Server did not start.\n${log}`);
  }

  async stop() {
    if (!this.process) return;
    const exited = new Promise((resolve) => this.process?.once("exit", resolve));
    this.process.kill("SIGTERM");
    await exited;
    this.process = null;
  }

  async dispose() {
    await this.stop();
    if (this.dataDir) await rm(this.dataDir, { recursive: true, force: true });
  }
}
