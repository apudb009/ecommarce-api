import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClientExceptionFilter } from 'prisma/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // ← this makes @Type() work
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    urls: ['http://localhost:3000'],
    creadentials: true,
  });

  // Bind the global Prisma exception filter
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(httpAdapter.getInstance()),
  );

  // ── SWAGGER ───────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Ecommerce API')
    .setDescription(
      'Complete E-Commerce REST API with cart, orders, payments and more',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Ecommerce')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true, // keeps token between page refreshes
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
