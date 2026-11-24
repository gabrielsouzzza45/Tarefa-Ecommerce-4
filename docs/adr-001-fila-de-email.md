# ADR 001: Fila assíncrona de envio de e-mail com lista Redis (`LPUSH` / `BRPOP`)

## Contexto

Anteriormente, o `OrderService` chamava o `NotificationService` de forma síncrona durante o processamento de `POST /orders`. Isso fazia com que o cliente aguardasse o envio do e-mail para receber a resposta da API e provocava falha na criação/confirmação do pedido caso o serviço de e-mail estivesse lento ou indisponível. Além disso, o envio de e-mail precisava ser desacoplado da API e executado por um `worker` em processo/container separado, suportando paradas temporárias do worker e escalonamento horizontal com múltiplas instâncias (`--scale worker=2`) sem envio duplicado.

## Decisão

Adotar uma fila persistente baseada em lista do Redis (`LPUSH` no produtor `RedisOrderQueue` e `BRPOP` bloqueante no consumidor `src/worker.ts`), em vez do mecanismo `PUBLISH`/`SUBSCRIBE` (Pub/Sub) do Redis:

- **Persistência na fila enquanto o worker está parado**: uma lista no Redis armazena os itens enfileirados até que sejam consumidos (`BRPOP`). Se o serviço `worker` for parado (`docker compose stop worker`) ou reiniciar, os pedidos permanecem na lista e são processados quando o worker retornar. O Pub/Sub do Redis é *fire-and-forget*: mensagens publicadas sem assinantes ativos são descartadas imediatamente.
- **Entrega exclusiva para um único worker (sem duplicidade em escala)**: `BRPOP` remove atomicamente o elemento da lista e o entrega a apenas um consumidor bloqueado. Com múltiplas instâncias do worker (`docker compose up -d --scale worker=2`), cada pedido é entregue a apenas um worker por vez, evitando o envio duplicado do mesmo e-mail.
- **Espera eficiente e desacoplamento arquitetural**: `BRPOP` bloqueia a conexão aguardando novos itens sem exigir *polling* contínuo, enquanto `OrderService` depende apenas da abstração `IOrderQueue`, mantendo o Redis isolado na camada de infraestrutura/fila.

## Consequências

- **Positivas**:
  - `POST /orders` responde rapidamente sem esperar o envio do e-mail, e falhas transitórias de e-mail não derrubam o fluxo principal do pedido.
  - Pedidos criados com o worker parado ficam retidos no Redis e são processados assim que o worker volta.
  - Escalar para múltiplos workers (`--scale worker=2`) distribui o trabalho sem duplicar o envio de e-mails.
  - Nenhum arquivo em `services/` ou `controllers/` importa o Redis diretamente.
- **Negativas / Trade-offs**:
  - Como `BRPOP` retira o item da lista no momento da leitura, se o worker falhar após o `BRPOP` e antes de concluir o envio do e-mail, esse item específico não retorna automaticamente à fila sem um mecanismo adicional (como lista de processamento/DLQ ou *retry*).
  - Adiciona mais um componente de infraestrutura (`redis`) ao ambiente e ao `compose.yaml`.
