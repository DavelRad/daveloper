import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

export interface ValidationErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error: string;
  errors?: ValidationErrorDetail[];
  correlationId?: string;
}

export interface ValidationErrorDetail {
  property: string;
  value: any;
  constraints: Record<string, string>;
  children?: ValidationErrorDetail[];
}

@Catch(BadRequestException)
export class ValidationFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    // Generate correlation ID for tracking
    const correlationId = this.generateCorrelationId();
    
    // Log the validation error
    this.logValidationError(request, exception, correlationId);
    
    // Format the error response
    const errorResponse = this.formatErrorResponse(
      request,
      exceptionResponse,
      status,
      correlationId,
    );
    
    // Set security headers
    this.setSecurityHeaders(response);
    
    response.status(status).json(errorResponse);
  }

  private formatErrorResponse(
    request: Request,
    exceptionResponse: any,
    status: number,
    correlationId: string,
  ): ValidationErrorResponse {
    const baseResponse: ValidationErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Validation failed',
      error: 'Bad Request',
      correlationId,
    };

    // Handle different response formats
    if (typeof exceptionResponse === 'string') {
      baseResponse.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      if (exceptionResponse.message) {
        baseResponse.message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message.join(', ')
          : exceptionResponse.message;
      }
      
      if (exceptionResponse.error) {
        baseResponse.error = exceptionResponse.error;
      }
      
      if (exceptionResponse.errors) {
        baseResponse.errors = this.processValidationErrors(exceptionResponse.errors);
      }
    }

    return baseResponse;
  }

  private processValidationErrors(errors: any[]): ValidationErrorDetail[] {
    return errors.map(error => this.processValidationError(error));
  }

  private processValidationError(error: any): ValidationErrorDetail {
    const detail: ValidationErrorDetail = {
      property: error.property || 'unknown',
      value: this.sanitizeValue(error.value),
      constraints: error.constraints || {},
    };

    if (error.children && Array.isArray(error.children)) {
      detail.children = error.children.map(child => this.processValidationError(child));
    }

    return detail;
  }

  private sanitizeValue(value: any): any {
    // Prevent sensitive data from being exposed in error responses
    if (typeof value === 'string') {
      // Mask potential sensitive patterns
      if (this.isSensitiveValue(value)) {
        return '[REDACTED]';
      }
      
      // Truncate very long values
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
    }
    
    return value;
  }

  private isSensitiveValue(value: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /credential/i,
      /ssn/i,
      /credit.*card/i,
      /card.*number/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(value));
  }

  private logValidationError(
    request: Request,
    exception: BadRequestException,
    correlationId: string,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const exceptionResponse = exception.getResponse();
    
    // Log error with context
    this.logger.warn(
      `Validation Error [${correlationId}]: ${method} ${url}`,
      {
        correlationId,
        method,
        url,
        ip,
        userAgent,
        statusCode: exception.getStatus(),
        error: exceptionResponse,
        timestamp: new Date().toISOString(),
      }
    );

    // Log additional security details if this might be an attack
    if (this.isSecurityRelevant(exceptionResponse)) {
      this.logger.warn(
        `Potential security issue detected [${correlationId}]: ${this.getSecurityContext(exceptionResponse)}`,
        {
          correlationId,
          ip,
          userAgent,
          securityAlert: true,
        }
      );
    }
  }

  private isSecurityRelevant(exceptionResponse: any): boolean {
    const securityKeywords = [
      'injection',
      'script',
      'traversal',
      'malicious',
      'suspicious',
      'deep',
      'large',
    ];

    const responseStr = JSON.stringify(exceptionResponse).toLowerCase();
    return securityKeywords.some(keyword => responseStr.includes(keyword));
  }

  private getSecurityContext(exceptionResponse: any): string {
    if (typeof exceptionResponse === 'object' && exceptionResponse.error) {
      switch (exceptionResponse.error) {
        case 'INJECTION_ATTEMPT':
          return 'NoSQL injection attempt detected';
        case 'SCRIPT_INJECTION':
          return 'Script injection attempt detected';
        case 'PATH_TRAVERSAL':
          return 'Path traversal attempt detected';
        case 'OBJECT_TOO_DEEP':
          return 'Extremely deep object submitted (potential DoS)';
        case 'PAYLOAD_TOO_LARGE':
          return 'Extremely large payload submitted (potential DoS)';
        default:
          return 'Security validation triggered';
      }
    }
    return 'Security validation triggered';
  }

  private setSecurityHeaders(response: Response): void {
    // Add security headers to error responses
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
  }

  private generateCorrelationId(): string {
    return `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Additional validation filters for different contexts
 */

@Catch(BadRequestException)
export class StrictValidationFilter extends ValidationFilter {
  private readonly logger = new Logger(StrictValidationFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    
    // Log all validation failures in strict mode
    this.logger.error(
      `Strict validation failure: ${request.method} ${request.url}`,
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        body: request.body,
        query: request.query,
        params: request.params,
      }
    );

    // Call parent implementation
    super.catch(exception, host);
  }
}

@Catch(BadRequestException)
export class SecurityValidationFilter extends ValidationFilter {
  private readonly logger = new Logger(SecurityValidationFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    // Enhanced security logging
    this.logger.warn(
      `Security validation triggered: ${request.method} ${request.url}`,
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        headers: this.sanitizeHeaders(request.headers),
        securityIncident: true,
        timestamp: new Date().toISOString(),
      }
    );

    // Rate limit headers for potential attackers
    response.setHeader('X-RateLimit-Limit', '10');
    response.setHeader('X-RateLimit-Remaining', '0');
    response.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 3600);

    // Call parent implementation
    super.catch(exception, host);
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers from logs
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

/**
 * Custom error classes for specific validation scenarios
 */
export class SecurityValidationException extends BadRequestException {
  constructor(message: string, errorCode: string) {
    super({
      message,
      error: errorCode,
      statusCode: HttpStatus.BAD_REQUEST,
      securityAlert: true,
    });
  }
}

export class ValidationLimitException extends BadRequestException {
  constructor(message: string, limit: string | number) {
    super({
      message,
      error: 'VALIDATION_LIMIT_EXCEEDED',
      limit,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
