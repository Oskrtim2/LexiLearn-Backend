import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';

@Injectable()
export class HashingService {
  private readonly bcryptRounds: number;
  private readonly visualSecret: string;
  private readonly dummyHash: Promise<string>;

  constructor(configService: ConfigService) {
    this.bcryptRounds = configService.getOrThrow<number>('auth.bcryptRounds');
    this.visualSecret = configService.getOrThrow<string>('auth.visualSecret');
    this.dummyHash = bcrypt.hash('000000', this.bcryptRounds);
  }

  hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, this.bcryptRounds);
  }

  verifyPin(pin: string, pinHash: string): Promise<boolean> {
    return bcrypt.compare(pin, pinHash);
  }

  /**
   * Performs a real bcrypt comparison for unknown student codes so that
   * response timing does not reveal which student codes exist.
   */
  async burnPinComparison(pin: string): Promise<void> {
    await bcrypt.compare(pin, await this.dummyHash);
  }

  hashVisualSequence(studentScope: string, sequence: readonly string[]): string {
    const normalized = sequence.map((icon) => icon.trim().toLowerCase()).join('\u001f');
    return createHmac('sha256', this.visualSecret)
      .update(studentScope)
      .update('\u001e')
      .update(normalized)
      .digest('hex');
  }

  verifyVisualSequence(
    studentScope: string,
    sequence: readonly string[],
    expectedHash: string,
  ): boolean {
    const actual = Buffer.from(this.hashVisualSequence(studentScope, sequence), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    if (actual.length !== expected.length || actual.length === 0) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  }
}
