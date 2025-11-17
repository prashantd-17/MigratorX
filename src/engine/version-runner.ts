import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { angularVersionRules } from "../core/version-map.js";
import { generateMarkdownLog } from "../reporting/log-writer.js";

export async function runVersionMigration(fromVersion: number, toVersion: number) {
  const ruleFilename = angularVersionRules[fromVersion];

  if (!ruleFilename) {
    throw new Error(`No rule found for migration ${fromVersion} → ${toVersion}`);
  }

  // Get directory of this file (inside migratorx package)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const rulePath = path.resolve(
    __dirname,
    "../frameworks/angular/rules",
    ruleFilename
  );

  if (!fs.existsSync(rulePath)) {
    throw new Error(`Rule file missing at ${rulePath}`);
  }

  const rule = (await import(`file://${rulePath}`)).default;

  const scanResult = await rule.runScanner();

  const logContent = generateMarkdownLog({
    fromVersion,
    toVersion,
    deprecatedItems: scanResult.deprecatedItems,
    autoFixes: scanResult.autoFixTargets,
  });

  return {
    ...scanResult,
    logContent,
  };
}
