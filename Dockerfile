FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

RUN ls -la /app/dist   # ← confirms dist was created

EXPOSE 3002

CMD sh -c "npx prisma migrate deploy && node dist/src/main.js"