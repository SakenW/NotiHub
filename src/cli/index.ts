#!/usr/bin/env node

/**
 * NotiHub CLI Entry Point
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('notihub')
  .description('Universal notification hub - Send events to multiple channels')
  .version(packageJson.version);

// Register commands (will implement these next)
// program.addCommand(await import('./commands/init.js').then(m => m.initCommand()));
// program.addCommand(await import('./commands/send.js').then(m => m.sendCommand()));
// program.addCommand(await import('./commands/config.js').then(m => m.configCommand()));
// program.addCommand(await import('./commands/serve.js').then(m => m.serveCommand()));

// Temporary placeholder commands
program
  .command('init')
  .description('Initialize NotiHub configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(options);
  });

program
  .command('send')
  .description('Send a notification')
  .option('-f, --file <path>', 'Read event from JSON file')
  .option('--source <source>', 'Event source')
  .option('--type <type>', 'Event type (success|error|warning|info)')
  .option('--severity <severity>', 'Severity (low|medium|high|critical)')
  .option('--title <title>', 'Event title')
  .option('--summary <summary>', 'Event summary')
  .action(async (options) => {
    const { sendCommand } = await import('./commands/send.js');
    await sendCommand(options);
  });

program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action: list|set|test')
  .argument('[key]', 'Config key (for set action)')
  .argument('[value]', 'Config value (for set action)')
  .action(async (action, key, value) => {
    const { configCommand } = await import('./commands/config.js');
    await configCommand(action, key, value);
  });

program
  .command('serve')
  .description('Start web server')
  .option('-p, --port <port>', 'Server port')
  .option('--host <host>', 'Server host')
  .option('--cloud', 'Run in cloud mode')
  .option('--daemon', 'Run as daemon')
  .action(async (options) => {
    const { serveCommand } = await import('./commands/serve.js');
    await serveCommand({
      port: options.port ? parseInt(options.port) : undefined,
      host: options.host,
      cloud: options.cloud,
      daemon: options.daemon,
    });
  });

program
  .command('dashboard')
  .description('Open dashboard in browser')
  .action(async () => {
    console.log('Dashboard command not yet implemented');
  });

program
  .command('status')
  .description('Show server status')
  .action(async () => {
    console.log('Status command not yet implemented');
  });

// Parse arguments
program.parse(process.argv);
