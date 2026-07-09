import { STATUS_CODES } from 'node:http';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { TranslationService } from '../shared/services/translation.service.ts';
import { constraintErrors } from './constraint-errors.ts';

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter<QueryFailedError> {
  constructor(
    public reflector: Reflector,
    private readonly translationService: TranslationService,
  ) {}

  async catch(
    exception: QueryFailedError & { constraint?: string },
    host: ArgumentsHost,
  ): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.constraint?.startsWith('UQ')
      ? HttpStatus.CONFLICT
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const key = exception.constraint
      ? constraintErrors[exception.constraint]
      : undefined;

    response.status(status).json({
      statusCode: status,
      error: STATUS_CODES[status],
      message: key ? await this.translationService.translate(key) : undefined,
    });
  }
}
