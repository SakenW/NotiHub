/**
 * Config Command - Manage configuration
 */

import chalk from 'chalk';
import { ConfigManager } from '../../application/config-manager.js';
import { stringify } from 'yaml';

export async function configCommand(
  action?: string,
  key?: string,
  value?: string
): Promise<void> {
  try {
    if (!action || action === 'list') {
      // List all configuration
      const config = ConfigManager.load();
      console.log(chalk.bold.cyan('\n📋 Current Configuration\n'));
      console.log(stringify(config));
      return;
    }

    if (action === 'get' && key) {
      // Get a specific value
      const val = ConfigManager.get(key);
      if (val === undefined) {
        console.log(chalk.yellow(`\n⚠️  Key "${key}" not found\n`));
      } else {
        console.log(chalk.cyan(`\n${key}:`), val, '\n');
      }
      return;
    }

    if (action === 'set' && key && value) {
      // Set a value
      ConfigManager.set(key, value);
      console.log(chalk.green(`\n✅ Set ${key} = ${value}\n`));
      return;
    }

    if (action === 'path') {
      // Show config path
      console.log(chalk.cyan(`\n${ConfigManager.getConfigPath()}\n`));
      return;
    }

    // Invalid usage
    console.log(chalk.yellow('\n⚠️  Invalid usage\n'));
    console.log(chalk.gray('Commands:'));
    console.log(chalk.cyan('  notihub config list                    # Show all config'));
    console.log(chalk.cyan('  notihub config get <key>               # Get a value'));
    console.log(chalk.cyan('  notihub config set <key> <value>       # Set a value'));
    console.log(chalk.cyan('  notihub config path                    # Show config path\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}
