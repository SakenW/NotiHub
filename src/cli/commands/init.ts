/**
 * Init Command - Initialize NotiHub configuration
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../application/config-manager.js';

export async function initCommand(options: { force?: boolean }): Promise<void> {
  console.log(chalk.bold.cyan('\n🚀 NotiHub Configuration Wizard\n'));

  // Check if config already exists
  if (ConfigManager.exists() && !options.force) {
    console.log(chalk.yellow('⚠️  Configuration already exists at:'));
    console.log(chalk.gray(`   ${ConfigManager.getConfigPath()}\n`));

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite it?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.gray('\nConfiguration unchanged. Use --force to overwrite.\n'));
      return;
    }
  }

  // Create default config
  const config = ConfigManager.createDefault();

  // Configure channels
  console.log(chalk.bold('\n📤 Configure Output Channels\n'));

  const { enabledChannels } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'enabledChannels',
      message: 'Select channels to enable:',
      choices: [
        { name: 'Feishu (飞书)', value: 'feishu' },
        { name: 'Slack', value: 'slack' },
        { name: 'DingTalk (钉钉)', value: 'dingtalk' },
      ],
    },
  ]);

  // Configure Feishu
  if (enabledChannels.includes('feishu')) {
    const feishuConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'webhook',
        message: 'Feishu webhook URL:',
        validate: (input) => input.length > 0 || 'Webhook URL is required',
      },
      {
        type: 'input',
        name: 'secret',
        message: 'Feishu webhook secret (optional):',
      },
      {
        type: 'confirm',
        name: 'sign',
        message: 'Enable signature verification?',
        default: false,
        when: (answers) => !!answers.secret,
      },
    ]);

    config.channels.feishu.enabled = true;
    config.channels.feishu.webhook = feishuConfig.webhook;
    if (feishuConfig.secret) {
      config.channels.feishu.secret = feishuConfig.secret;
      config.channels.feishu.sign = feishuConfig.sign;
    }
  }

  // Configure Slack
  if (enabledChannels.includes('slack')) {
    const slackConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'webhook',
        message: 'Slack webhook URL:',
        validate: (input) => input.length > 0 || 'Webhook URL is required',
      },
    ]);

    config.channels.slack.enabled = true;
    config.channels.slack.webhook = slackConfig.webhook;
  }

  // Configure DingTalk
  if (enabledChannels.includes('dingtalk')) {
    const dingtalkConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'webhook',
        message: 'DingTalk webhook URL:',
        validate: (input) => input.length > 0 || 'Webhook URL is required',
      },
      {
        type: 'input',
        name: 'secret',
        message: 'DingTalk webhook secret:',
        validate: (input) => input.length > 0 || 'Secret is required',
      },
    ]);

    config.channels.dingtalk.enabled = true;
    config.channels.dingtalk.webhook = dingtalkConfig.webhook;
    config.channels.dingtalk.secret = dingtalkConfig.secret;
  }

  // Configure policies
  console.log(chalk.bold('\n⚙️  Configure Policies\n'));

  const policies = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'deduplication',
      message: 'Enable deduplication?',
      default: true,
    },
    {
      type: 'number',
      name: 'dedupTtl',
      message: 'Deduplication TTL (seconds):',
      default: 60,
      when: (answers) => answers.deduplication,
    },
    {
      type: 'confirm',
      name: 'rateLimit',
      message: 'Enable rate limiting?',
      default: true,
    },
    {
      type: 'number',
      name: 'rateLimitMax',
      message: 'Max notifications per minute:',
      default: 10,
      when: (answers) => answers.rateLimit,
    },
  ]);

  if (config.policies.deduplication) {
    config.policies.deduplication.enabled = policies.deduplication;
    if (policies.deduplication) {
      config.policies.deduplication.ttl = policies.dedupTtl;
    }
  }

  if (config.policies.rate_limit) {
    config.policies.rate_limit.enabled = policies.rateLimit;
    if (policies.rateLimit) {
      config.policies.rate_limit.max_per_minute = policies.rateLimitMax;
    }
  }

  // Save configuration
  const spinner = ora('Saving configuration...').start();

  try {
    ConfigManager.ensureDirectories();
    ConfigManager.save(config);
    spinner.succeed('Configuration saved!');

    console.log(chalk.green('\n✅ NotiHub initialized successfully!\n'));
    console.log(chalk.gray('Configuration file:'));
    console.log(chalk.cyan(`   ${ConfigManager.getConfigPath()}\n`));
    console.log(chalk.gray('Auth token (for HTTP API):'));
    console.log(chalk.yellow(`   ${config.server.auth.token}\n`));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.white('   1. Test a notification:'));
    console.log(chalk.cyan('      notihub send --source=test --type=success --title="Hello" --summary="World"\n'));
    console.log(chalk.white('   2. Start web dashboard:'));
    console.log(chalk.cyan('      notihub serve\n'));
  } catch (error: any) {
    spinner.fail('Failed to save configuration');
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}
