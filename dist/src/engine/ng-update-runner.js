import { spawn } from "child_process";
import chalk from "chalk";
export async function runNgUpdateStep(nextVersion) {
    return new Promise((resolve, reject) => {
        const args = [
            "ng",
            "update",
            `@angular/core@${nextVersion}`,
            `@angular/cli@${nextVersion}`,
            "--force",
            "--allow-dirty"
        ];
        console.log(chalk.cyan(`\n⚙ Running Angular CLI: npx ${args.join(" ")}`));
        const child = spawn("npx", args, {
            stdio: "inherit",
            shell: process.platform === "win32"
        });
        child.on("exit", (code) => {
            if (code === 0) {
                console.log(chalk.green(`✅ Angular CLI update completed for target ${nextVersion}`));
                resolve();
            }
            else {
                reject(new Error(`ng update exited with code ${code}`));
            }
        });
    });
}
