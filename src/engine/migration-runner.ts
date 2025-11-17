import { runVersionMigration } from "./version-runner.js";
import { applyAutoFixes } from "./auto-fixer.js";

export async function runFullMigration(fromVersion: number, toVersion: number) {
  const scanResult = await runVersionMigration(fromVersion, toVersion);
  const fixesApplied = await applyAutoFixes(scanResult.autoFixTargets);

  return {
    log: scanResult.logContent,
    fixesApplied
  };
}
