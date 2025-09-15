import { NextRequest, NextResponse } from 'next/server';
import { validateUserCredentials } from '@/lib/auth';
import { withErrorHandling, withRateLimit } from '@/middleware/auth';

export const POST = withErrorHandling(
  withRateLimit(10, 15 * 60 * 1000)( // 10 attempts per 15 minutes
    async (request: NextRequest) => {
      const { email, password } = await request.json();

      // Basic validation
      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: 'Email and password are required' },
          { status: 400 }
        );
      }

      // Validate credentials
      const result = await validateUserCredentials(email.toLowerCase().trim(), password);

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 401 }
        );
      }

      // Create response with user data and token
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });

      // Set HTTP-only cookie for web clients
      response.cookies.set('auth-token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }
  )
);
