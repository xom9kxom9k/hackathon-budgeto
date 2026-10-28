import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch } from '@nestjs/common';
import type { Response } from 'express';
import { ImportError } from '../../shared/import-parser/import-errors';

@Catch(ImportError)
export class ImportErrorFilter implements ExceptionFilter<ImportError> {
  catch(exception: ImportError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      code: exception.code,
      message: exception.message,
    });
  }
}
