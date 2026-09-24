import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { isPrismaErrorWithCode } from '../prisma/prisma-errors.js';

interface HttpErrorBody {
  message?: unknown;
  error?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly isProduction: boolean,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<{
      originalUrl?: string;
      url?: string;
    }>();
    const response = context.getResponse<unknown>();
    const { statusCode, error, message } = this.describeException(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const details = exception instanceof Error ? exception.stack : exception;
      this.logger.error('Erro não tratado durante a requisição.', details);
    }

    this.adapterHost.httpAdapter.reply(
      response,
      {
        statusCode,
        error,
        message:
          this.isProduction && statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
            ? 'Erro interno do servidor.'
            : message,
        path: request.originalUrl ?? request.url ?? '',
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }

  private describeException(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const body =
        typeof response === 'object' && response !== null
          ? (response as HttpErrorBody)
          : undefined;
      const message = body?.message ?? response;

      return {
        statusCode,
        error:
          typeof body?.error === 'string'
            ? body.error
            : this.statusName(statusCode),
        message:
          typeof message === 'string' ||
          (Array.isArray(message) &&
            message.every((item) => typeof item === 'string'))
            ? (message as string | string[])
            : exception.message,
      };
    }

    if (isPrismaErrorWithCode(exception, 'P2002')) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Um registro com estes dados já existe.',
      };
    }
    if (isPrismaErrorWithCode(exception, 'P2003')) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'O registro está relacionado a outros dados.',
      };
    }
    if (isPrismaErrorWithCode(exception, 'P2004')) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Unprocessable Entity',
        message: 'A operação viola uma restrição financeira do domínio.',
      };
    }
    if (isPrismaErrorWithCode(exception, 'P2025')) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Registro não encontrado.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Erro interno do servidor.',
    };
  }

  private statusName(statusCode: number): string {
    const name = HttpStatus[statusCode];
    return typeof name === 'string'
      ? name
          .toLowerCase()
          .split('_')
          .map((word) => word[0]?.toUpperCase() + word.slice(1))
          .join(' ')
      : 'Error';
  }
}
