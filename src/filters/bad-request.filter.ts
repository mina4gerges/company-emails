import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, UnprocessableEntityException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import type { Response } from 'express';
import _ from 'lodash';

import { TranslationService } from '../shared/services/translation.service.ts';

@Catch(UnprocessableEntityException)
export class HttpExceptionFilter
  implements ExceptionFilter<UnprocessableEntityException>
{
  constructor(
    public reflector: Reflector,
    private readonly translationService: TranslationService,
  ) {}

  async catch(
    exception: UnprocessableEntityException,
    host: ArgumentsHost,
  ): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = exception.getStatus();
    const r = exception.getResponse() as { message: ValidationError[] };

    const validationErrors = r.message;
    await this.validationFilter(validationErrors);

    response.status(statusCode).json(r);
  }

  private async validationFilter(
    validationErrors: ValidationError[],
  ): Promise<void> {
    await Promise.all(
      validationErrors.map(async (validationError) => {
        const children = validationError.children;

        if (children && !_.isEmpty(children)) {
          await this.validationFilter(children);

          return;
        }

        delete validationError.children;

        const constraints = validationError.constraints;

        if (!constraints) {
          return;
        }

        await Promise.all(
          Object.entries(constraints).map(
            async ([constraintKey, constraint]) => {
              // dismissed defaults fall back to an error.fields.{key} i18n key
              const key =
                constraint || `error.fields.${_.snakeCase(constraintKey)}`;

              constraints[constraintKey] =
                await this.translationService.translate(key);
            },
          ),
        );
      }),
    );
  }
}
