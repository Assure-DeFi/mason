#!/usr/bin/env node

import { Command } from 'commander';

import { initCommand } from '../commands/init.js';
import { doctorCommand } from '../commands/doctor.js';
import { version } from '../version.js';

const program = new Command();

program
  .name('mason')
  .description(
    'Mason - Continuous-improvement PM system for web app repositories',
  )
  .version(version);

// Setup wizard
program.addCommand(initCommand);

// Environment check
program.addCommand(doctorCommand);

// Parse arguments
program.parse();
