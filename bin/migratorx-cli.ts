#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from "inquirer";
import chalk from 'chalk';
import { detectProjectVersion } from '../src/core/version-detector.js';
import { runLogsMode, runMigrateMode } from '../src/index.js';

process.stdin.setRawMode?.(true);
const program = new Command();

const banner = `
${chalk.cyanBright('╔═══════════════════════════════════════════════╗')}
${chalk.cyanBright('║')}     ⚡ ${chalk.magentaBright('M I G R A T O R  X  S Y S T E M')} ⚡     ${chalk.cyanBright('║')}
${chalk.cyanBright('║')}  ${chalk.blueBright('Initializing Quantum Migration Core...')}       ${chalk.cyanBright('║')}
${chalk.cyanBright('╚═══════════════════════════════════════════════╝')}
`;

program
  .name('migratorx')
  .description('The futuristic migration engine for upgrading frameworks smoothly')
  .version('1.0.0');

program.action(async () => {
  console.log(banner);

  const currentVersion = await detectProjectVersion();

  console.log(
    chalk.greenBright(`🔍 Framework detected → Angular v${currentVersion}`)
  );

  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Choose an operation:',
      choices: [
        { name: 'Analyze blockers (logs only, no changes)', value: 'logs' },
        { name: 'Migrate to a target version (with auto fixes + logs)', value: 'migrate' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);

  if (mode === 'exit') {
    console.log(chalk.yellowBright('🛑 Terminating MigratorX System...'));
    process.exit(0);
  }

  const { targetVersion } = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetVersion',
      message: 'Enter target Angular version:',
      validate: input =>
        /^[0-9]+$/.test(input) ? true : 'Enter a valid numeric version'
    }
  ]);

  

  if (mode === 'logs') {
    await runLogsMode(currentVersion, Number(targetVersion));
    return;
  }

  if (mode === 'migrate') {
    // Ask if autofixer should be used
    const { enableAutofixer } = await inquirer.prompt([
      {
        type: 'list',
        name: 'enableAutofixer',
        message: 'Do you want MigratorX to apply real autofixes automatically?',
        choices: [
          { name: 'Yes — Apply autofixes automatically (recommended)', value: true },
          { name: 'No — Only generate logs, do not change any files', value: false }
        ]
      }
    ]);

    // Ask whether to pause between steps
    const { askStep } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'askStep',
        message: 'Pause and review logs after each version step before continuing?',
        default: false
      }
    ]);

    await runMigrateMode(
      currentVersion,
      Number(targetVersion),
      askStep,
      enableAutofixer
    );

    return;
  }
});

program.parse();
