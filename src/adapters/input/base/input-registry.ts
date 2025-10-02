/**
 * Input Registry - Manages all input adapters
 */

import { InputAdapter } from './input-adapter.interface.js';

export class InputRegistry {
  private static adapters = new Map<string, InputAdapter>();

  /**
   * Register an input adapter
   */
  static register(adapter: InputAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get adapter by name
   */
  static get(name: string): InputAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get all registered adapters
   */
  static getAll(): InputAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Clear all registered adapters
   */
  static clear(): void {
    this.adapters.clear();
  }

  /**
   * Check if adapter exists
   */
  static has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Get adapter names
   */
  static getNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Initialize adapters
   * This should be called after all adapter implementations are loaded
   */
  static async init(): Promise<void> {
    // Adapters will be registered by their respective modules
    console.log(`Initialized ${this.adapters.size} input adapters`);
  }
}
