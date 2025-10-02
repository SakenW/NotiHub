/**
 * Feishu Signature Generator
 */

import { createHmac } from 'crypto';

export class FeishuSigner {
  constructor(private secret: string) {}

  generateSignature(): { timestamp: string; sign: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `${timestamp}\n${this.secret}`;

    const sign = createHmac('sha256', stringToSign)
      .update('')
      .digest('base64');

    return { timestamp, sign };
  }

  /**
   * Verify incoming webhook signature
   */
  verify(timestamp: string, sign: string): boolean {
    const generated = this.generateSignature();

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const receivedTime = parseInt(timestamp, 10);

    if (Math.abs(now - receivedTime) > 300) {
      return false;
    }

    return generated.sign === sign;
  }
}
