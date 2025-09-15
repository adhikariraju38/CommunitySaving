import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/middleware/auth';

export const POST = withErrorHandling(
  async () => {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful',
    });

    // Clear the auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  }
);
