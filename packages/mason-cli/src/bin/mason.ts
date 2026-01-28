#!/usr/bin/env node

import { Command } from 'commander';

import { initCommand } from '../commands/init.js';
import { doctorCommand } from '../commands/doctor.js';
import { reviewCommand } from '../commands/review.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';
import { approveCommand } from '../commands/approve.js';
import { executeCommand } from '../commands/execute.js';
import { statusCommand } from '../commands/status.js';
import { version } from '../version.js';

const program = new Command();

program
  .name('mason')
  .description('Agentic continuous-improvement system for web app repositories')
  .version(version);

// Add commands
program.addCommand(initCommand);
program.addCommand(doctorCommand);
program.addCommand(reviewCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(approveCommand);
program.addCommand(executeCommand);
program.addCommand(statusCommand);

// Parse arguments
program.parse();
