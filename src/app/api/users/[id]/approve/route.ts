import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// PATCH /api/users/[id]/approve - Approve a pending user
const patchHandler = withAuth(async (request: AuthenticatedRequest) => {
  // Extract ID from URL path
  const pathSegments = request.nextUrl.pathname.split('/');
  const userId = pathSegments[pathSegments.length - 2]; // Gets the id from /api/users/[id]/approve
  try {
    await connectDB();

    // Only admin can approve users
    if (request.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }


    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'User is not pending approval' },
        { status: 400 }
      );
    }

    // Approve the user
    user.status = 'approved';
    user.isActive = true;
    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        isActive: user.isActive,
      },
      message: 'User approved successfully'
    });

  } catch (error) {
    console.error('Error approving user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PATCH = withErrorHandling(patchHandler);
