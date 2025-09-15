import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken, JWTPayload } from '@/lib/auth-edge';

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

// Authentication middleware
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const token = getTokenFromRequest(req);

      if (!token) {
        return NextResponse.json(
          { success: false, message: 'Access token required' },
          { status: 401 }
        );
      }

      const payload = await verifyToken(token);

      if (!payload) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Add user info to request
      (req as AuthenticatedRequest).user = payload;

      return handler(req as AuthenticatedRequest);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

// Role-based authorization middleware
export function withRole(roles: ('admin' | 'member')[]) {
  return function (handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse) {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!roles.includes(req.user.role)) {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(req);
    });
  };
}

// Admin only middleware
export function withAdmin(handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse) {
  return withRole(['admin'])(handler);
}

// Member or Admin middleware
export function withMember(handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse) {
  return withRole(['admin', 'member'])(handler);
}

// Self or Admin access middleware (user can access their own data or admin can access any)
export function withSelfOrAdmin(getUserId: (req: NextRequest) => string) {
  return function (handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse) {
    return withAuth(async (req: AuthenticatedRequest) => {
      const targetUserId = getUserId(req);
      
      if (req.user.role !== 'admin' && req.user.userId !== targetUserId) {
        return NextResponse.json(
          { success: false, message: 'Access denied: You can only access your own data' },
          { status: 403 }
        );
      }

      return handler(req);
    });
  };
}

// Rate limiting helper (basic implementation)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function withRateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return function (handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      const clientData = rateLimitMap.get(clientIP) || { count: 0, lastReset: now };

      // Reset count if window expired
      if (clientData.lastReset < windowStart) {
        clientData.count = 0;
        clientData.lastReset = now;
      }

      // Check if limit exceeded
      if (clientData.count >= maxRequests) {
        return NextResponse.json(
          { success: false, message: 'Too many requests' },
          { status: 429 }
        );
      }

      // Increment count
      clientData.count++;
      rateLimitMap.set(clientIP, clientData);

      return handler(req);
    };
  };
}

// Validation middleware
export function withValidation<T>(schema: {
  validate: (data: any) => { error?: any; value: T };
}) {
  return function (handler: (req: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        let data;
        const contentType = req.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          data = await req.json();
        } else {
          // Handle form data or other content types as needed
          data = {};
        }

        const result = schema.validate(data);

        if (result.error) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Validation failed', 
              errors: result.error.details?.map((d: any) => d.message) || [result.error.message]
            },
            { status: 400 }
          );
        }

        return handler(req, result.value);
      } catch (error) {
        console.error('Validation middleware error:', error);
        return NextResponse.json(
          { success: false, message: 'Invalid request data' },
          { status: 400 }
        );
      }
    };
  };
}

// Error handling middleware
export function withErrorHandling(handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Validation failed',
            errors: Object.values(error.errors).map((err: any) => err.message)
          },
          { status: 400 }
        );
      }

      if (error.name === 'CastError') {
        return NextResponse.json(
          { success: false, message: 'Invalid ID format' },
          { status: 400 }
        );
      }

      if (error.code === 11000) {
        return NextResponse.json(
          { success: false, message: 'Duplicate entry' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
