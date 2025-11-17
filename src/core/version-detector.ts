import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import chalk from 'chalk';

export async function detectProjectVersion(): Promise<number> {
  try {
    const projectRoot = process.cwd();
    const packageJsonPath = path.join(projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.log(chalk.red('❌ No package.json found. Run MigratorX inside a project folder.'));
      process.exit(1);
    }

    // Read package.json
    const packageJson = await fs.readJSON(packageJsonPath);

    // Detect version from "dependencies" or "devDependencies"
    let angularCoreVersion: string | undefined =
      packageJson.dependencies?.['@angular/core'] ||
      packageJson.devDependencies?.['@angular/core'];

    // Fallback: read node_modules if not found in package.json
    if (!angularCoreVersion) {
      const nodeCorePkg = path.join(projectRoot, 'node_modules/@angular/core/package.json');
      if (fs.existsSync(nodeCorePkg)) {
        const corePkgJson = await fs.readJSON(nodeCorePkg);
        angularCoreVersion = corePkgJson.version;
      }
    }

    // If still not found — exit
    if (!angularCoreVersion) {
      console.log(chalk.red('❌ Angular framework not detected in this project.'));
      console.log(chalk.yellow('💡 MigratorX currently supports Angular projects only.'));
      process.exit(1);
    }

    // Clean version string (remove ^, ~)
    const cleanVersion = semver.coerce(angularCoreVersion);
    const major = cleanVersion?.major;

    if (!major) {
      console.log(chalk.red('❌ Failed to parse @angular/core version.'));
      console.log(chalk.yellow(`Detected version string: ${angularCoreVersion}`));
      process.exit(1);
    }

    return major;
  } catch (err) {
    console.error(chalk.red('💥 Unexpected error occurred while detecting Angular version:'), err);
    process.exit(1);
  }
}
