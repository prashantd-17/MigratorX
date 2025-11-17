import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { applyAutoFixes } from '../engine/auto-fixer.js';
import { runVersionMigration } from '../engine/version-runner.js';
import { printTerminalSummary } from "../reporting/terminal-summary.js";
import { runNgUpdateStep } from "../engine/ng-update-runner.js";
export async function runMigrateMode(currentVersion, targetVersion, askStepConfirmation, enableAutofixer) {
    console.log(chalk.cyanBright('\n🧬 MIGRATION MODE — Automatic migration with logs.'));
    if (targetVersion <= currentVersion) {
        console.log(chalk.red(`❌ Target version must be higher than current version (${currentVersion}).`));
        process.exit(1);
    }
    const logsDir = path.join(process.cwd(), 'migration-logs');
    await fs.ensureDir(logsDir);
    for (let v = currentVersion; v < targetVersion; v++) {
        const nextVersion = v + 1;
        const stepLabel = `${v} → ${nextVersion}`;
        console.log(chalk.blueBright(`\n🚀 Migrating ${stepLabel} ...`));
        try {
            // 1️⃣ Ask user if we should run Angular CLI update for this step
            const { runCliUpdate } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'runCliUpdate',
                    message: `Do you want MigratorX to run "npx ng update @angular/core@${nextVersion} @angular/cli@${nextVersion}" for this step?`,
                    default: true
                }
            ]);
            if (runCliUpdate) {
                try {
                    await runNgUpdateStep(nextVersion);
                }
                catch (cliErr) {
                    console.error(chalk.red(`💥 Angular CLI update failed for ${stepLabel}. You may need to fix issues and re-run.`));
                    console.error(cliErr);
                    // Stop here because dependencies may be in partial state
                    return;
                }
            }
            else {
                console.log(chalk.yellow(`⏭ Skipping Angular CLI update for ${stepLabel}. Angular packages might still be on v${v}.`));
            }
            // 2️⃣ Run MigratorX scanner AFTER (or regardless of) CLI update
            const scanResult = await runVersionMigration(v, nextVersion);
            // 3️⃣ Apply autofixes (code-level)
            let autoFixesApplied = 0;
            if (enableAutofixer) {
                autoFixesApplied = await applyAutoFixes(scanResult.autoFixTargets);
            }
            else {
                console.log("\n⚠ Autofixer disabled — no code changes will be made for this step.");
            }
            // 4️⃣ Save report
            const logFile = path.join(logsDir, `${v}-to-${nextVersion}-report.md`);
            await fs.writeFile(logFile, scanResult.logContent);
            // 5️⃣ Pretty terminal summary
            printTerminalSummary({
                fromVersion: v,
                toVersion: nextVersion,
                deprecatedItems: scanResult.deprecatedItems,
                autoFixes: scanResult.autoFixTargets
            });
            console.log(chalk.green(`📄 Log saved: migration-logs/${v}-to-${nextVersion}-report.md`));
            console.log(chalk.yellowBright(`🔧 Fixes applied in this step: ${autoFixesApplied}`));
            // 6️⃣ Pause option before next step
            if (askStepConfirmation && nextVersion < targetVersion) {
                const { proceed } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'proceed',
                        message: `Continue migration to ${nextVersion + 1}?`,
                        default: true
                    }
                ]);
                if (!proceed) {
                    console.log(chalk.yellowBright('🛑 Migration stopped by user.'));
                    return;
                }
            }
        }
        catch (err) {
            console.error(chalk.red(`💥 Migration failed at step ${stepLabel}`));
            console.error(err);
            return;
        }
    }
    console.log(chalk.magentaBright(`\n✨ Migration completed successfully!`));
    console.log(chalk.yellow(`📂 Full logs available in the "migration-logs/" directory.`));
}
