import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/users/members-list - Get list of all active members for dropdowns (Admin only)
const getHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can view members list
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Get all active members
        const members = await User.find({
            role: 'member',
            isActive: true,
            status: 'approved'
        })
            .select('_id name memberId email phone')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: members,
        });

    } catch (error) {
        console.error('Error fetching members list:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const GET = withErrorHandling(getHandler);
