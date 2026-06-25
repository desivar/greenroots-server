import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
}

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Email already registered';
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err.stack);
  }

  res.status(statusCode).json({ message });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
};
