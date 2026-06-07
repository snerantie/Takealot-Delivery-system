import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from './errorHandler';

/**
 * Middleware factory that validates `req.body` against a Zod schema.
 * Accepts any Zod schema (objects as well as `.refine()`/`ZodEffects`).
 * On success, replaces req.body with the parsed (and coerced) data.
 * On failure, forwards a 400 AppError with a readable message.
 */
export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((e) => `${e.path.join('.') || 'field'}: ${e.message}`)
          .join('; ');
        return next(new AppError(message, 400));
      }
      next(error);
    }
  };
};
