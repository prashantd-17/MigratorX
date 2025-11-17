import chalk from "chalk";
export function printTerminalSummary({ fromVersion, toVersion, deprecatedItems, autoFixes }) {
    const required = deprecatedItems.filter(i => !i.startsWith("ℹ"));
    const optional = deprecatedItems.filter(i => i.startsWith("ℹ"));
    console.log(chalk.cyanBright(`\n📌 Summary for ${fromVersion} → ${toVersion}`));
    console.log(chalk.green(`  🔧 Autofixes applied: ${autoFixes.length}`));
    console.log(chalk.red(`  🚨 Required issues: ${required.length}`));
    console.log(chalk.yellow(`  💡 Suggestions: ${optional.length}`));
    if (required.length) {
        console.log(chalk.redBright("\n🚨 Required:"));
        required.slice(0, 5).forEach(r => console.log(`  - ${r}`));
        if (required.length > 5)
            console.log(`  ...and ${required.length - 5} more`);
    }
    if (optional.length) {
        console.log(chalk.yellowBright("\n💡 Optional:"));
        optional.slice(0, 3).forEach(r => console.log(`  - ${r}`));
        if (optional.length > 3)
            console.log(`  ...and ${optional.length - 3} more`);
    }
    console.log(chalk.cyanBright("\n📄 Full report saved to migration-logs/\n"));
}
