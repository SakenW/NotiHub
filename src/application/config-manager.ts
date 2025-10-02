/**
 * Configuration Manager
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { AppConfig } from '../domain/types.js';
import { nanoid } from 'nanoid';

export class ConfigManager {
  private static DEFAULT_CONFIG_DIR = join(homedir(), '.notihub');
  private static DEFAULT_CONFIG_PATH = join(ConfigManager.DEFAULT_CONFIG_DIR, 'config.yaml');

  /**
   * Get config file path
   */
  static getConfigPath(): string {
    return process.env.NOTIHUB_CONFIG || ConfigManager.DEFAULT_CONFIG_PATH;
  }

  /**
   * Get config directory
   */
  static getConfigDir(): string {
    return dirname(ConfigManager.getConfigPath());
  }

  /**
   * Check if config exists
   */
  static exists(): boolean {
    return existsSync(ConfigManager.getConfigPath());
  }

  /**
   * Load configuration
   */
  static load(): AppConfig {
    const configPath = ConfigManager.getConfigPath();

    if (!existsSync(configPath)) {
      throw new Error(
        `Configuration not found at ${configPath}. Run 'notihub init' first.`
      );
    }

    const content = readFileSync(configPath, 'utf-8');
    const config = parseYaml(content) as AppConfig;

    // Merge with environment variables
    return ConfigManager.mergeWithEnv(config);
  }

  /**
   * Save configuration
   */
  static save(config: AppConfig): void {
    const configPath = ConfigManager.getConfigPath();
    const configDir = dirname(configPath);

    // Ensure directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Convert to YAML and save
    const yaml = stringifyYaml(config);
    writeFileSync(configPath, yaml, 'utf-8');
  }

  /**
   * Create default configuration
   */
  static createDefault(): AppConfig {
    return {
      version: '1',
      server: {
        enabled: true,
        port: 3000,
        host: '0.0.0.0',
        mode: 'local',
        auth: {
          token: nanoid(32),
        },
      },
      inputs: {
        cli: {
          enabled: true,
        },
        http: {
          enabled: true,
          webhook_path: '/webhooks/notify',
        },
        'claude-code': {
          enabled: false,
          webhook_path: '/webhooks/claude-code',
        },
        github: {
          enabled: false,
          webhook_path: '/webhooks/github',
        },
      },
      channels: {
        feishu: {
          enabled: false,
          type: 'webhook',
          webhook: '',
          secret: '',
          sign: false,
        },
        slack: {
          enabled: false,
          type: 'webhook',
          webhook: '',
        },
        dingtalk: {
          enabled: false,
          type: 'webhook',
          webhook: '',
          secret: '',
        },
      },
      policies: {
        deduplication: {
          enabled: true,
          ttl: 60,
        },
        rate_limit: {
          enabled: true,
          max_per_minute: 10,
        },
        retry: {
          enabled: true,
          max_attempts: 3,
          backoff: [1, 4, 10],
        },
      },
    };
  }

  /**
   * Merge config with environment variables
   */
  private static mergeWithEnv(config: AppConfig): AppConfig {
    if (process.env.NOTIHUB_MODE) {
      config.server.mode = process.env.NOTIHUB_MODE as 'local' | 'cloud';
    }

    if (process.env.NOTIHUB_PORT) {
      config.server.port = parseInt(process.env.NOTIHUB_PORT, 10);
    }

    if (process.env.NOTIHUB_AUTH_TOKEN) {
      config.server.auth.token = process.env.NOTIHUB_AUTH_TOKEN;
    }

    if (process.env.DATABASE_URL && !config.database) {
      config.database = {
        type: 'postgres',
        url: process.env.DATABASE_URL,
      };
    }

    return config;
  }

  /**
   * Get a config value by dot notation path
   */
  static get(key: string): any {
    const config = ConfigManager.load();
    const parts = key.split('.');
    let value: any = config;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set a config value by dot notation path
   */
  static set(key: string, value: any): void {
    const config = ConfigManager.load();
    const parts = key.split('.');
    const lastKey = parts.pop()!;
    let target: any = config;

    // Navigate to the parent object
    for (const part of parts) {
      if (!(part in target)) {
        target[part] = {};
      }
      target = target[part];
    }

    // Set the value
    target[lastKey] = value;

    ConfigManager.save(config);
  }

  /**
   * Ensure required directories exist
   */
  static ensureDirectories(): void {
    const configDir = ConfigManager.getConfigDir();
    const logsDir = join(configDir, 'logs');
    const dataDir = join(configDir, 'data');

    for (const dir of [configDir, logsDir, dataDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }
}
