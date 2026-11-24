import 'reflect-metadata';
import 'dotenv/config';
import { createClient } from 'redis';
import { container } from './container/container';
import { NotificationService } from './services/NotificationService';
import { Order } from './domain/Order';
import { ORDER_QUEUE_KEY } from './queues/RedisOrderQueue';
import logger from './lib/logger';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const notificationService = container.get(NotificationService);

async function startWorker() {
  const client = createClient({ url: redisUrl });

  client.on('error', (err) => {
    logger.error(`Erro no cliente Redis do worker: ${err.message}`);
  });

  await client.connect();
  logger.info(`Worker conectado ao Redis em ${redisUrl}. Aguardando pedidos na fila "${ORDER_QUEUE_KEY}"...`);

  while (true) {
    try {
      const result = await client.brPop(ORDER_QUEUE_KEY, 0);
      if (!result) {
        continue;
      }

      const order: Order = JSON.parse(result.element);
      const emailPreview = await notificationService.orderConfirmed(order);
      logger.info(`Email enviado para pedido #${order.id}: ${emailPreview}`);
    } catch (err: any) {
      logger.error(`Erro ao processar pedido da fila: ${err.message}`);
    }
  }
}

startWorker().catch((err) => {
  logger.error(`Falha fatal no worker: ${err.message}`);
  process.exit(1);
});
