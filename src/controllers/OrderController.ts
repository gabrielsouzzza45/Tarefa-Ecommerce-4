import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import logger from '../lib/logger';
import { PaymentError, ValidationError } from '../domain/errors';
import { OrderService } from '../services/OrderService';

@injectable()
export class OrderController {
  constructor(@inject(OrderService) private orderService: OrderService) {}

  processOrder = async (req: Request, res: Response) => {
    try {
      const { customer, items, paymentMethod, paymentDetails } = req.body;
      const result = await this.orderService.placeOrder(customer, items, paymentMethod, paymentDetails);
      return res.json({ message: 'Pedido processado com sucesso', ...result });
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof PaymentError) {
        return res.status(400).json({ error: error.message });
      }
      logger.error(`Erro ao processar pedido: ${error.message}`);
      return res.status(500).json({ error: 'Erro interno' });
    }
  };

  getOrder = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const order = await this.orderService.getOrder(id);
      return res.status(200).json(order);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return res.status(404).json({ error: error.message });
      }
      logger.error(`Erro ao buscar pedido: ${error.message}`);
      return res.status(500).json({ error: 'Erro interno' });
    }
  };
}