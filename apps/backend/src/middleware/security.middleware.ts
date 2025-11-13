import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Rate limiter for general API endpoints
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for NPC chat endpoint
 * Limits: 20 requests per 15 minutes per IP (more restrictive due to AI API costs)
 */
export const npcChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 NPC chat requests per windowMs
  message: 'Too many NPC chat requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for authentication/session endpoints
 * Limits: 5 requests per minute per IP
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Sanitize user input to prevent NoSQL injection
 */
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized input detected: ${key} in request from ${req.ip}`);
  },
});

/**
 * Custom XSS protection middleware
 * Validates and sanitizes common XSS attack vectors
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Helper function to check for XSS patterns
  const containsXSS = (value: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /onerror\s*=/gi,
      /onload\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /<iframe[^>]*>/gi,
      /eval\(/gi,
      /expression\(/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  };

  // Helper function to sanitize string
  const sanitizeString = (value: string): string => {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  // Check request body
  if (req.body) {
    try {
      const checkObject = (obj: any): any => {
        if (typeof obj === 'string') {
          if (containsXSS(obj)) {
            console.warn(`XSS attempt detected in request from ${req.ip}`);
            return sanitizeString(obj);
          }
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(checkObject);
        }

        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          for (const key in obj) {
            sanitized[key] = checkObject(obj[key]);
          }
          return sanitized;
        }

        return obj;
      };

      req.body = checkObject(req.body);
    } catch (error) {
      console.error('Error in XSS protection middleware:', error);
    }
  }

  // Check query parameters
  if (req.query) {
    for (const key in req.query) {
      const value = req.query[key];
      if (typeof value === 'string' && containsXSS(value)) {
        console.warn(`XSS attempt detected in query param from ${req.ip}`);
        req.query[key] = sanitizeString(value);
      }
    }
  }

  next();
};

/**
 * Input validation middleware for chat messages
 * Ensures messages meet basic requirements
 */
export const validateChatMessage = (req: Request, res: Response, next: NextFunction) => {
  const { message } = req.body;

  if (!message) {
    res.status(400).json({
      success: false,
      error: 'Message is required',
    });
    return;
  }

  if (typeof message !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Message must be a string',
    });
    return;
  }

  // Check message length (max 1000 characters)
  if (message.length > 1000) {
    res.status(400).json({
      success: false,
      error: 'Message is too long (max 1000 characters)',
    });
    return;
  }

  // Check message length (min 1 character)
  if (message.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Message cannot be empty',
    });
    return;
  }

  next();
};

/**
 * Validate NPC ID format
 */
export const validateNpcId = (req: Request, res: Response, next: NextFunction) => {
  const { npcId } = req.body;

  if (!npcId) {
    res.status(400).json({
      success: false,
      error: 'NPC ID is required',
    });
    return;
  }

  if (typeof npcId !== 'string') {
    res.status(400).json({
      success: false,
      error: 'NPC ID must be a string',
    });
    return;
  }

  // NPC IDs should be UUIDs (basic format check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(npcId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid NPC ID format',
    });
    return;
  }

  next();
};
