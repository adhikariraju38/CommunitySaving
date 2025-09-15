import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';

export const POST = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    await connectToDatabase();

    // Get fresh user data from database
    const user = await User.findById(request.user.userId).select('-password');

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User not found or inactive' },
        { status: 404 }
      );
    }

    // Generate new token with updated user information
    const newToken = await generateToken(user);

    return NextResponse.json({
      success: true,
      data: {
        token: newToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          memberId: user.memberId,
          phone: user.phone,
          isActive: user.isActive,
          joinDate: user.joinDate,
          lastLogin: user.lastLogin,
        },
      },
      message: 'Token refreshed successfully'
    });
  })
);
