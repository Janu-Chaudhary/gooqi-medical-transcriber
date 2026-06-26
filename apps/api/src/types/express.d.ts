/**
 * Augment Express's Request type with auth context attached by requireAuth.
 */
import "express";

declare global {
  namespace Express {
    interface Request {
      doctorId?: string;
      userEmail?: string;
    }
  }
}

export {};
