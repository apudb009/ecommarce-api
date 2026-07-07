// prisma-exception.filter.ts
import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { Prisma } from 'src/generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');
    console.error(`Prisma Client Exception: ${message}`);
    // Map Prisma error codes to HTTP Status Codes
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation (e.g., duplicate email)
        const status = HttpStatus.CONFLICT; // 409
        response.status(status).json({
          statusCode: status,
          message: 'A record with this unique value already exists.',
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        // Record not found
        const status = HttpStatus.NOT_FOUND; // 404
        response.status(status).json({
          statusCode: status,
          message: 'The requested record was not found.',
          error: 'Not Found',
        });
        break;
      }
      default:
        // Fallback to NestJS default handling for other Prisma errors
        super.catch(exception, host);
        break;
    }
  }
}
