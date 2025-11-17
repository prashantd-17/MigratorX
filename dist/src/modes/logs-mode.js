import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { runVersionMigration } from '../engine/version-runner.js';
import { printTerminalSummary } from "../reporting/terminal-summary.js";
export async function runLogsMode(currentVersion, targetVersion) {
    console.log(chalk.cyanBright('\n📊 LOGS-ONLY MODE — No automatic fixes will be applied.'));
    if (targetVersion <= currentVersion) {
        console.log(chalk.red(`❌ Target version must be higher than current version (${currentVersion}).`));
        process.exit(1);
    }
    const logsDir = path.join(process.cwd(), 'migration-logs');
    await fs.ensureDir(logsDir);
    for (let v = currentVersion; v < targetVersion; v++) {
        const nextVersion = v + 1;
        const step = `${v} → ${nextVersion}`;
        console.log(chalk.blueBright(`\n🔎 Analyzing ${step} ...`));
        try {
            const analysisResult = await runVersionMigration(v, nextVersion);
            const logFile = path.join(logsDir, `${v}-to-${nextVersion}-report.md`);
            await fs.writeFile(logFile, analysisResult.logContent);
            console.log(chalk.green(`📄 Log saved: migration-logs/${v}-to-${nextVersion}-report.md`));
            // ⬇ ADD SUMMARY HERE — uses variables inside this loop (so no TS error)
            printTerminalSummary({
                fromVersion: v,
                toVersion: nextVersion,
                deprecatedItems: analysisResult.deprecatedItems,
                autoFixes: analysisResult.autoFixTargets
            });
        }
        catch (err) {
            console.error(chalk.red(`💥 Analysis failed at step ${step}`));
            console.error(err);
            return;
        }
    }
    console.log(chalk.magentaBright(`\n✨ Log analysis completed!`));
    console.log(chalk.yellow(`📂 Check the "migration-logs/" directory for full reports.`));
}
