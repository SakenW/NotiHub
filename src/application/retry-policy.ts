/**
 * Retry Policy
 */

export interface RetryConfig {
  maxAttempts: number;
  backoff: number[]; // [1, 4, 10] seconds
}

export class RetryPolicy {
  constructor(private config: RetryConfig) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt < this.config.maxAttempts - 1) {
          const delay = this.config.backoff[attempt] || this.config.backoff[this.config.backoff.length - 1];
          console.log(
            `[Retry] Attempt ${attempt + 1}/${this.config.maxAttempts} failed for ${context || 'unknown'}. Retrying in ${delay}s...`
          );
          await this.sleep(delay * 1000);
        }
      }
    }

    throw lastError || new Error('Max retry attempts reached');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
