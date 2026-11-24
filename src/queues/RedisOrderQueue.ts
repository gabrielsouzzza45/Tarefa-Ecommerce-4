import { inject, injectable } from 'inversify';
import { createClient } from 'redis';
import { TYPES } from '../container/types';
import { Order } from '../domain/Order';
import { IOrderQueue } from './IOrderQueue';

export const ORDER_QUEUE_KEY = 'orders:email:queue';

@injectable()
export class RedisOrderQueue implements IOrderQueue {
  private client: ReturnType<typeof createClient>;
  private connectPromise: Promise<void> | null = null;

  constructor(@inject(TYPES.RedisUrl) private redisUrl: string) {
    this.client = createClient({ url: this.redisUrl });
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().then(() => {
        this.connectPromise = null;
      }).catch((err) => {
        this.connectPromise = null;
        throw err;
      });
    }
    await this.connectPromise;
  }

  async publish(order: Order): Promise<void> {
    await this.ensureConnected();
    await this.client.lPush(ORDER_QUEUE_KEY, JSON.stringify(order));
  }
}
