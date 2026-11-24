# E-commerce — Projeto 4

Projeto de E-commerce desenvolvido com Node.js, TypeScript, Express, Prisma, InversifyJS e Redis.

Nesta etapa, a aplicação utiliza Docker Compose para executar a **API**, o banco de dados **PostgreSQL**, o **Redis** e um **worker** em containers separados. O envio de e-mail foi desacoplado da API: ao criar um pedido, a API publica a mensagem em uma fila do Redis (`LPUSH`) e responde imediatamente, enquanto o worker consome a fila (`BRPOP`) de forma assíncrona e envia a confirmação por e-mail.

## Como rodar

Pré-requisitos:

- Docker instalado.
- Docker Compose disponível.

1. Configurar o ambiente

Clone o repositório e entre na pasta do projeto.

Crie o arquivo `.env` a partir do exemplo (que já inclui `DATABASE_URL` e `REDIS_URL`):

```bash
cp .env.example .env
```

2. Iniciar a aplicação
```bash
docker compose up --build
```

O próprio comando npm start, executado pelo Dockerfile, realiza a criação das tabelas, o cadastro inicial dos produtos e a inicialização do servidor.

Após a inicialização, a API estará disponível em:

http://localhost:3000

## Como testar

Os testes podem ser realizados utilizando PowerShell, Postman ou Insomnia. Teste com:

1. Testando a API com Insomnia

Os testes da API podem ser realizados pelo Insomnia, uma ferramenta que permite enviar requisições HTTP e visualizar as respostas.

Com os containers em execução (docker compose up --build), siga os passos abaixo:

Abra o Insomnia e crie uma nova requisição.

Selecione o método POST.

Utilize a URL:

http://localhost:3000/orders

Na aba Body, selecione JSON.

Insira os dados do pedido no formato esperado pela API.

```bash
{
  "customer": "cliente@teste.com",
  "items": [
    {
      "productId": 1,
      "quantity": 1
    }
  ],
  "paymentMethod": "pix"
}
```

Clique em Send e verifique que a API responde rapidamente sem esperar pelo envio do e-mail.

Para acompanhar o envio do e-mail pelo worker, visualize os logs do container:

```bash
docker compose logs -f worker
```

2. Consultar um pedido pelo ID

Crie uma nova requisição no Insomnia.

Selecione o método GET.

Utilize a URL, substituindo ID_DO_PEDIDO pelo ID retornado na criação:

http://localhost:3000/orders/ID_DO_PEDIDO

Ou seja, se o por exemplo o ID do pedido for 1, utilize:

http://localhost:3000/orders/1 para ver o primeiro pedido.

Clique em Send e verifique se a API retorna os dados do pedido correspondente.

3. Testar um pedido inexistente

Crie outra requisição com o método GET.

Utilize uma URL com um ID que não exista:

http://localhost:3000/orders/999999

Clique em Send.

Verifique se a API retorna o status 404 Not Found.

4. Testar fila com worker parado e escalonamento

Worker parado: pare o worker com:
```bash
docker compose stop worker
```

Envie novos pedidos em POST /orders e depois suba novamente com:
```bash
docker compose start worker
```
Os pedidos aguardam na fila do Redis e os e-mails são enviados assim que o worker volta.

Múltiplos workers: escale o worker com 
```bash
docker compose up -d --scale worker=2 
```

E envie novos pedidos. Cada pedido é consumido e enviado apenas uma vez.

## Estrutura

```
docs/
└── adr-001-fila-de-email.md   # Decisão arquitetural da fila Redis (LPUSH / BRPOP)

src/
├── container/                 # Configuração das dependências (InversifyJS)
├── controllers/               # Controle das requisições HTTP
├── domain/                    # Entidades e regras de negócio
├── lib/                       # Utilitários (logger)
├── payments/                  # Formas de pagamento
├── providers/                 # Provedores de serviços (e-mail)
├── queues/                    # Interface e implementação da fila Redis
├── repositories/              # Interfaces e implementações dos repositórios
├── services/                  # Regras de negócio
├── app.ts                     # Configuração das rotas
├── server.ts                  # Inicialização do servidor HTTP
└── worker.ts                  # Consumidor da fila de e-mails
```

---

