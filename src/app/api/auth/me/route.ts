import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';

export const GET = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    await connectToDatabase();

    // Get user details from database (fresh data)
    const user = await User.findById(request.user.userId).select('-password');

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User not found or inactive' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
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
    });
  })
);
