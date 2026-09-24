# Personal Finance API

API REST para controle financeiro pessoal, construída com NestJS, TypeScript, Prisma ORM e PostgreSQL. A API é a fonte oficial dos dados e está preparada para consumo por um aplicativo React Native/Expo.

## Funcionalidades

- registro e login com JWT e senha protegida por bcrypt;
- categorias padrão e personalizadas;
- contas, cartões (somente quatro últimos dígitos), transações e filtros;
- transferências atômicas entre contas;
- faturas, pagamento integral e compras parceladas;
- preview, revisão e confirmação de CSV com deduplicação;
- regras simples de categorização automática;
- dashboard por período, mês e categoria;
- validação estrita, respostas de erro uniformes, CORS e OpenAPI.

A aplicação é dividida em módulos de domínio em `src/`. Controllers tratam HTTP, services concentram regras de negócio e o acesso persistente passa pelo `PrismaService`. Operações com múltiplas gravações usam transações do Prisma.

## Requisitos

- Node.js `^22.22.3`, `^24.15.0` ou `>=26` (Node 24 recomendado)
- npm
- Docker com Docker Compose
- PostgreSQL (fornecido pelo Compose para desenvolvimento)

> O NestJS 12 e o Prisma 7 não funcionam no Node 16. Confirme com `node --version` antes de instalar.

## Instalação

```bash
npm install
cp .env.example .env
```

Ajuste o `.env` quando necessário. O arquivo é ignorado pelo Git; apenas `.env.example` deve ser versionado.

## Banco de dados

Suba o PostgreSQL 17 local:

```bash
docker compose up -d
```

Gere o client e aplique as migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

O projeto usa migrations, não `prisma db push`, como fluxo principal. Migrations existentes:

- `20260924174915_init`: schema financeiro inicial;
- `20260924182745_allow_invalid_import_items`: staging de linhas inválidas no preview CSV.

## Seed

```bash
npx prisma db seed
```

O seed é idempotente para o usuário abaixo e cria categorias padrão, duas contas, cartão, transações, transferência, faturas e um notebook em 12 parcelas:

```text
E-mail: dev@finance.local
Senha: DevPassword123!
```

A senha é transformada com bcrypt antes da persistência. Ao executar novamente, apenas os dados desse usuário de desenvolvimento são recriados.

## Executar

```bash
npm run start:dev
```

API: `http://localhost:3000`

- Health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` | `development` |
| `DATABASE_URL` | conexão PostgreSQL | `postgresql://postgres:postgres@localhost:5432/finance?schema=public` |
| `JWT_SECRET` | segredo JWT com pelo menos 32 caracteres | substitua em produção |
| `JWT_EXPIRES_IN` | validade do JWT | `7d` |
| `PORT` | porta HTTP | `3000` |
| `CORS_ORIGINS` | allowlist separada por vírgulas | `http://localhost:8081,http://localhost:19006` |

`CORS_ORIGINS` não aceita `*` e deve ser informado explicitamente em produção. Aplicativos mobile nativos normalmente não são restringidos por CORS, mas Expo Web e clientes web são.

## Autenticação

Registre ou autentique o usuário:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"João","email":"joao@example.com","password":"senha-segura-123"}'

curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"joao@example.com","password":"senha-segura-123"}'
```

Use o `accessToken` retornado:

```http
Authorization: Bearer <token>
```

O proprietário nunca é lido do body. Todos os recursos privados usam o ID do JWT, e as consultas/mutações incluem ownership no service. Recursos alheios respondem como não encontrados.

## Endpoints

### Autenticação e usuário

| Método | Rota |
| --- | --- |
| `POST` | `/auth/register` |
| `POST` | `/auth/login` |
| `GET` | `/users/me` |

### Categorias, contas e cartões

| Método | Rota |
| --- | --- |
| `POST`, `GET` | `/categories` |
| `PATCH`, `DELETE` | `/categories/:id` |
| `POST`, `GET` | `/accounts` |
| `GET`, `PATCH`, `DELETE` | `/accounts/:id` |
| `POST`, `GET` | `/credit-cards` |
| `GET`, `PATCH`, `DELETE` | `/credit-cards/:id` |

`DELETE` de conta, cartão, categoria e regra é uma desativação lógica (`isActive=false`) para preservar o histórico.

### Transações e transferências

| Método | Rota |
| --- | --- |
| `POST`, `GET` | `/transactions` |
| `GET`, `PATCH`, `DELETE` | `/transactions/:id` |
| `POST` | `/transactions/transfers` |

Uma transação comum informa exatamente um `accountId` ou `creditCardId`. Para transferências, a API cria um agregado `Transfer` e duas movimentações ligadas pelo mesmo `transferId`: débito na origem e crédito no destino. Ambas possuem tipo `TRANSFER`, portanto não são receitas ou despesas no dashboard.

Filtros de `GET /transactions`:

```text
page, limit, startDate, endDate, type, status,
categoryId, accountId, creditCardId, search,
sortBy, sortOrder
```

Exemplo:

```http
GET /transactions?page=1&limit=20&startDate=2026-09-01&endDate=2026-09-30&type=EXPENSE&search=ifood&sortBy=amount&sortOrder=desc
```

Resposta paginada:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### Faturas e parcelamentos

| Método | Rota |
| --- | --- |
| `GET` | `/credit-cards/:creditCardId/invoices` |
| `GET` | `/invoices/:id` |
| `POST` | `/invoices/:id/pay` |
| `POST`, `GET` | `/installments` |
| `GET` | `/installments/:id` |

Transações de cartão são ligadas automaticamente ao ciclo calculado com `closingDay` e `dueDay`. O pagamento exige uma conta do mesmo usuário, debita o total e cria um `InvoicePayment` atômico. Nesta primeira versão o pagamento é integral e único; ele não cria outra despesa, evitando dupla contagem do consumo já registrado no cartão.

Uma compra parcelada cria um único `InstallmentGroup`. Cada parcela contém `installmentGroupId`, `installmentNumber` e `totalInstallments`, e é ligada à sua fatura. A divisão ocorre em centavos; eventual resto vai para a última parcela.

### Regras automáticas

| Método | Rota |
| --- | --- |
| `POST`, `GET` | `/rules` |
| `GET`, `PATCH`, `DELETE` | `/rules/:id` |

A primeira versão avalia `description` com `CONTAINS`, `EQUALS`, `STARTS_WITH` ou `ENDS_WITH`, em ordem de prioridade. As regras sugerem categorias durante o preview CSV.

### Importação CSV

| Método | Rota |
| --- | --- |
| `POST` | `/imports/csv/preview` |
| `GET`, `DELETE` | `/imports/:id` |
| `PATCH` | `/imports/:batchId/items/:itemId` |
| `POST` | `/imports/:id/confirm` |

Envie `multipart/form-data` com `file` e exatamente um destino (`accountId` ou `creditCardId`):

```bash
curl -X POST http://localhost:3000/imports/csv/preview \
  -H 'Authorization: Bearer <token>' \
  -F 'accountId=<uuid>' \
  -F 'file=@transacoes.csv'
```

Formato mínimo, com delimitador `,` ou `;`:

```csv
date;description;amount;externalId
2026-09-20;Salário;8000,00;bank-001
2026-09-21;IFOOD;-75,50;bank-002
```

Também são reconhecidos cabeçalhos comuns em português (`data`, `descrição`, `valor`, `tipo`), datas `DD/MM/YYYY` e tipos `RECEITA`/`DESPESA`. Sem coluna `type`, o sinal do valor define receita ou despesa. Limites: arquivo `.csv` de até 5 MB e 2.000 linhas.

O preview persiste somente `ImportBatch`/`ImportItem`; nenhuma `Transaction` é criada. Itens `INVALID` podem ser corrigidos via `PATCH`. A confirmação cria apenas itens `READY` dentro de uma única transação de banco.

#### Deduplicação

A estratégia usa SHA-256 em duas camadas:

1. `fileHash` sobre os bytes bloqueia o mesmo arquivo, mesmo renomeado;
2. cada item recebe `deduplicationHash`, com índice único por usuário no banco.

Quando existe `externalId`, o fingerprint combina versão, usuário, conta/cartão e ID externo. Sem ID externo, combina usuário, destino, data, descrição normalizada, valor, tipo e `occurrenceIndex`. O índice de ocorrência permite duas linhas legítimas idênticas no mesmo arquivo. Em arquivos sobrepostos sem IDs externos, transações realmente idênticas ainda podem exigir revisão manual; essa ambiguidade é preservada no preview em vez de ser inserida automaticamente.

OFX ficou preparado como extensão futura, mas não faz parte desta versão.

### Dashboard

| Método | Rota |
| --- | --- |
| `GET` | `/dashboard/summary` |
| `GET` | `/dashboard/monthly` |
| `GET` | `/dashboard/categories` |

Todos aceitam `startDate` e `endDate`. Sem filtros, usam o mês UTC atual. Apenas transações `COMPLETED` de tipo `INCOME` ou `EXPENSE` entram nos totais.

```json
{
  "income": 8000,
  "expense": 5200,
  "balance": 2800
}
```

## Valores monetários

Valores são validados com no máximo duas casas decimais, persistidos como `Decimal(19,2)` no PostgreSQL e nunca como `float`/`double`. A API recebe e retorna números JSON:

```json
{
  "amount": 125.5
}
```

Um interceptor converte `Decimal` para `number` apenas na borda HTTP. Os DTOs limitam os valores a uma faixa em que os centavos permanecem dentro da precisão inteira segura do JavaScript. Cálculos de saldo, fatura e divisão de parcelas usam `Decimal` no domínio e no banco.

## Validação e erros

O pipe global usa:

```ts
ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
```

Propriedades desconhecidas geram `400`. Erros seguem o formato:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Conta não encontrada.",
  "path": "/accounts/uuid",
  "timestamp": "2026-09-24T12:00:00.000Z"
}
```

Stack traces e detalhes internos não são enviados ao cliente.

## Scripts

```bash
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm test
npm run test:e2e
npm run test:cov
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run prisma:seed
```

Os testes unitários cobrem ciclos de fatura e fingerprints de deduplicação. A suíte E2E usa PostgreSQL e cobre registro/login, categorias padrão, ownership, transação/saldo, transferência, parcelamento, pagamento duplicado, preview e CSV duplicado. Suba o banco e aplique migrations antes de `npm run test:e2e`.

## Limites intencionais da primeira versão

- importação OFX;
- pagamentos parciais ou múltiplos de fatura;
- edição/cancelamento completo de agregados de transferência e parcelamento;
- regras compostas com múltiplas condições;
- refresh token, recuperação de senha e revogação de sessões;
- recorrências e conciliação bancária externa.

Esses itens podem ser adicionados sem alterar a separação atual dos módulos nem a fonte oficial de dados.
