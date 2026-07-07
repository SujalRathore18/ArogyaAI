import { Request, Response, NextFunction } from "express";
import { verifyToken, AuthTokenPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/** Attaches req.user if a valid Bearer token is present; does not block the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // invalid/expired token — treat as unauthenticated rather than erroring
    }
  }
  next();
}

/** Blocks the request with 401 unless a valid Bearer token is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/** Blocks the request with 403 unless req.user.role is in the allowed list. */
export function requireRole(...roles: Array<"patient" | "mgmt" | "guest">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  };
}
