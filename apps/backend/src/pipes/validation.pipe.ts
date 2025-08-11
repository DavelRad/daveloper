import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';
import * as DOMPurify from 'isomorphic-dompurify';

export interface ValidationOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
  sanitize?: boolean;
  maxDepth?: number;
  maxLength?: number;
}

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);
  
  constructor(private readonly options: ValidationOptions = {}) {
    // Set default options
    this.options = {
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      sanitize: true,
      maxDepth: 10,
      maxLength: 10000,
      ...options,
    };
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }

    try {
      // Pre-validation security checks
      this.performSecurityChecks(value, metadata);

      // Sanitize input if enabled
      if (this.options.sanitize) {
        value = this.sanitizeInput(value);
      }

      // Transform plain object to class instance
      const object = plainToClass(metadata.metatype, value, {
        enableImplicitConversion: this.options.transform,
      });

      // Validate the object
      const errors = await validate(object, {
        whitelist: this.options.whitelist,
        forbidNonWhitelisted: this.options.forbidNonWhitelisted,
        skipMissingProperties: this.options.skipMissingProperties,
      });

      if (errors.length > 0) {
        const formattedErrors = this.formatValidationErrors(errors);
        this.logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
          statusCode: 400,
        });
      }

      return object;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Validation pipe error: ${error.message}`, error.stack);
      throw new BadRequestException({
        message: 'Invalid input data',
        error: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private performSecurityChecks(value: any, metadata: ArgumentMetadata): void {
    if (!value) return;

    // Check for extremely deep objects (potential DoS)
    if (this.getObjectDepth(value) > this.options.maxDepth!) {
      throw new BadRequestException({
        message: `Input object too deeply nested (max: ${this.options.maxDepth})`,
        error: 'OBJECT_TOO_DEEP',
        statusCode: 400,
      });
    }

    // Check for extremely large payloads
    const serialized = JSON.stringify(value);
    if (serialized.length > this.options.maxLength!) {
      throw new BadRequestException({
        message: `Input too large (max: ${this.options.maxLength} characters)`,
        error: 'PAYLOAD_TOO_LARGE',
        statusCode: 400,
      });
    }

    // Check for potential NoSQL injection patterns
    this.checkForNoSQLInjection(value);

    // Check for potential script injection
    this.checkForScriptInjection(value);

    // Check for potential path traversal
    this.checkForPathTraversal(value);
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeInput(item));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Sanitize both keys and values
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeInput(val);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;

    // Remove or encode potentially dangerous characters
    let sanitized = input;

    // Basic XSS protection
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Limit length to prevent memory exhaustion
    if (sanitized.length > 5000) {
      sanitized = sanitized.substring(0, 5000);
    }

    // Remove control characters except common whitespace
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  private checkForNoSQLInjection(value: any): void {
    const checkValue = (val: any): void => {
      if (typeof val === 'string') {
        // Check for MongoDB injection patterns
        const suspiciousPatterns = [
          /\$where/i,
          /\$ne/i,
          /\$gt/i,
          /\$lt/i,
          /\$or/i,
          /\$and/i,
          /\$regex/i,
          /\$exists/i,
          /javascript:/i,
          /eval\s*\(/i,
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(val)) {
            throw new BadRequestException({
              message: 'Potentially malicious input detected',
              error: 'INJECTION_ATTEMPT',
              statusCode: 400,
            });
          }
        }
      } else if (Array.isArray(val)) {
        val.forEach(checkValue);
      } else if (val !== null && typeof val === 'object') {
        Object.values(val).forEach(checkValue);
        
        // Check for suspicious object keys
        Object.keys(val).forEach(key => {
          if (key.startsWith('$') || key.includes('..')) {
            throw new BadRequestException({
              message: 'Invalid object property detected',
              error: 'INVALID_PROPERTY',
              statusCode: 400,
            });
          }
        });
      }
    };

    checkValue(value);
  }

  private checkForScriptInjection(value: any): void {
    const checkValue = (val: any): void => {
      if (typeof val === 'string') {
        // Check for script injection patterns
        const scriptPatterns = [
          /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /eval\s*\(/gi,
          /expression\s*\(/gi,
          /vbscript:/gi,
          /data:text\/html/gi,
        ];

        for (const pattern of scriptPatterns) {
          if (pattern.test(val)) {
            this.logger.warn(`Script injection attempt detected: ${val.substring(0, 100)}...`);
            throw new BadRequestException({
              message: 'Script injection attempt detected',
              error: 'SCRIPT_INJECTION',
              statusCode: 400,
            });
          }
        }
      } else if (Array.isArray(val)) {
        val.forEach(checkValue);
      } else if (val !== null && typeof val === 'object') {
        Object.values(val).forEach(checkValue);
      }
    };

    checkValue(value);
  }

  private checkForPathTraversal(value: any): void {
    const checkValue = (val: any): void => {
      if (typeof val === 'string') {
        // Check for path traversal patterns
        const traversalPatterns = [
          /\.\.\//g,
          /\.\.\\\/g,
          /%2e%2e%2f/gi,
          /%2e%2e\\\/gi,
          /\.\./g,
        ];

        for (const pattern of traversalPatterns) {
          if (pattern.test(val)) {
            throw new BadRequestException({
              message: 'Path traversal attempt detected',
              error: 'PATH_TRAVERSAL',
              statusCode: 400,
            });
          }
        }
      } else if (Array.isArray(val)) {
        val.forEach(checkValue);
      } else if (val !== null && typeof val === 'object') {
        Object.values(val).forEach(checkValue);
      }
    };

    checkValue(value);
  }

  private getObjectDepth(obj: any, depth: number = 0): number {
    if (depth > 20) return depth; // Prevent stack overflow

    if (obj === null || typeof obj !== 'object') {
      return depth;
    }

    if (Array.isArray(obj)) {
      return Math.max(depth, ...obj.map(item => this.getObjectDepth(item, depth + 1)));
    }

    const values = Object.values(obj);
    if (values.length === 0) {
      return depth;
    }

    return Math.max(...values.map(value => this.getObjectDepth(value, depth + 1)));
  }

  private formatValidationErrors(errors: ValidationError[]): any {
    const formatError = (error: ValidationError): any => {
      const result: any = {
        property: error.property,
        value: error.value,
        constraints: error.constraints || {},
      };

      if (error.children && error.children.length > 0) {
        result.children = error.children.map(formatError);
      }

      return result;
    };

    return errors.map(formatError);
  }
}

/**
 * Specialized validation pipes for different use cases
 */

@Injectable()
export class StrictValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      sanitize: true,
      maxDepth: 5,
      maxLength: 5000,
    });
  }
}

@Injectable()
export class LenientValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      skipMissingProperties: true,
      sanitize: true,
      maxDepth: 15,
      maxLength: 50000,
    });
  }
}

@Injectable()
export class SecurityValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      sanitize: true,
      maxDepth: 3,
      maxLength: 1000,
    });
  }
}
