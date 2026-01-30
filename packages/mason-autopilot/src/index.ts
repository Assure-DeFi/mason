#!/usr/bin/env node
/**
 * Mason Autopilot CLI
 *
 * A daemon that runs scheduled PM reviews and executions for Mason.
 * Runs locally on the user's machine, using their Claude Code subscription.
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { installCommand } from './commands/install.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('mason-autopilot')
  .description(
    'Autopilot daemon for Mason - automated codebase analysis and execution',
  )
  .version('0.1.0');

program
  .command('init')
  .description('Initialize autopilot configuration')
  .action(initCommand);

program
  .command('start')
  .description('Start the autopilot daemon')
  .option('-d, --daemon', 'Run in background (detached) mode')
  .option('-v, --verbose', 'Show verbose output')
  .action(startCommand);

program
  .command('install')
  .description('Install as a system service (survives reboot)')
  .action(installCommand);

program
  .command('status')
  .description('Show autopilot daemon status')
  .action(statusCommand);

program.parse();
