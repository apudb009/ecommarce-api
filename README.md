# Ecommerce API

A NestJS + Prisma ecommerce backend with role-based permissions, admin management, product/category seeding, and PostgreSQL storage.

## Tech stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Docker Compose
- JWT authentication

## Prerequisites

Before starting, make sure you have:

- Node.js 20+
- Yarn or npm
- Docker + Docker Compose
- PostgreSQL (or use the provided Docker setup)

## 1) Clone and install

```bash
git clone <your-repo-url>
cd ecommerce-api
yarn install
```

If you are using npm instead of yarn:

```bash
npm install
```

## 2) Environment variables

Create a `.env` file in the project root if it does not already exist. The required values should match your database and auth setup.

Example:

```env
DATABASE_URL="postgresql://testuser:testpassword@localhost:5432/ecommercedb"
POSTGRES_USER=testuser
POSTGRES_PASSWORD=testpassword
POSTGRES_DB=ecommercedb

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

PORT=3002
FRONTEND_URL=http://localhost:3000

MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mailtrap_user
MAIL_PASS=your_mailtrap_password
MAIL_FROM=noreply@example.com

STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 3) Start the database with Docker

```bash
docker compose up -d db
```

This starts PostgreSQL on port `5433` from the local `docker-compose.yml` configuration.

## 4) Prisma setup and migrations

Run the database migrations:

```bash
yarn prisma migrate dev
```

If you want to apply existing migrations without dev mode:

```bash
yarn prisma migrate deploy
```

Generate the Prisma client:

```bash
yarn prisma generate
```

## 5) Seed the database

This project includes a seed script that creates permissions and assigns them to the default admin role.

```bash
yarn prisma db seed
```

The seed script does the following:

- creates all permission records for modules/actions
- creates the `ADMIN` role
- assigns every admin permission to it
- assigns the admin role to any existing user with `role = 'ADMIN'`

The inventory of default system modules includes:

- dashboard
- users
- products
- categories
- orders
- invoices
- coupons
- banners
- reviews
- returns
- flash-sales
- analytics
- notifications
- settings
- taxes
- shipping
- wishlists
- scheduler
- roles
- newsletters

Actions seeded for each module:

- create
- read
- update
- delete

## 6) Create the super admin user

This project has a CLI command to create a new admin account.

Interactive mode:

```bash
yarn run admin:create
```

You will be prompted for:

- email
- name
- username
- password

Direct flag mode:

```bash
yarn run admin:create --email admin@shop.com --name "Super Admin" --username admin --password StrongPass123
```

This creates a user with:

```text
role: ADMIN
```

The CLI command is defined here:

```bash
src/cli/commands/create-admin.command.ts
```

and registered in:

```bash
src/cli/cli.ts
```

## 7) Run the app

Development mode:

```bash
yarn run start:dev
```

Normal mode:

```bash
yarn run start
```

Production build:

```bash
yarn run build
yarn run start:prod
```

## 8) Useful project commands

### List users

```bash
yarn run user:list
```

### Reset a password

```bash
yarn run password:reset
```

### Seed categories

```bash
yarn run categories:seed
```

### Seed products

```bash
yarn run products:seed
```

### Import products

```bash
yarn run products:import
```

### View CLI help

```bash
yarn run cli --help
```

## 9) Role and permission API

This app includes a role system with permission-based access. The main endpoints are under:

```text
/api/roles
```

Available features include:

- list roles
- get a role by id
- create a role
- update a role
- assign a role to a user
- delete a role
- fetch all permissions

Example role payload:

```json
{
  "name": "MANAGER",
  "description": "Store manager",
  "permissions": [
    { "module": "orders", "action": "read" },
    { "module": "products", "action": "update" }
  ]
}
```

## 10) Development workflow

Typical setup flow for a fresh project:

```bash
docker compose up -d db
yarn install
yarn prisma generate
yarn prisma migrate dev
yarn prisma db seed
yarn run admin:create
yarn run start:dev
```

## 11) Troubleshooting

### Prisma client issues

```bash
yarn prisma generate
```

### Database connection issues

Check your `DATABASE_URL` and make sure PostgreSQL is running:

```bash
docker compose ps
docker logs ecommerce_db
```

### Admin creation fails

Common causes:

- email is already in use
- username is already in use
- password is shorter than 8 characters
- invalid email format

## 12) Notes

The admin creation command creates a regular user record with the `ADMIN` role, while the seed script is responsible for generating the underlying permission set and default system roles. This matches the app’s current RBAC structure.

## License

This project is not currently configured with a public license in the package metadata.
