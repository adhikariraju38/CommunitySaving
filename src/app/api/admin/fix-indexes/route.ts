import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// POST /api/admin/fix-indexes - Fix database indexes for bulk member creation (Admin only)
const postHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can fix indexes
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Get the underlying MongoDB collection
        const collection = User.collection;

        try {
            // Drop the existing email index if it exists
            await collection.dropIndex('email_1');
            console.log('Dropped existing email index');
        } catch (error) {
            // Index might not exist, which is fine
            console.log('No existing email index to drop');
        }

        // Create new sparse unique index for email
        await collection.createIndex(
            { email: 1 },
            {
                unique: true,
                sparse: true,
                name: 'email_sparse_unique'
            }
        );

        // Ensure memberId index is unique
        try {
            await collection.dropIndex('memberId_1');
        } catch (error) {
            // Index might not exist
        }

        await collection.createIndex(
            { memberId: 1 },
            {
                unique: true,
                name: 'memberId_unique'
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Database indexes fixed successfully. You can now create bulk members.'
        });

    } catch (error) {
        console.error('Error fixing indexes:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fix database indexes' },
            { status: 500 }
        );
    }
});

export const POST = withErrorHandling(postHandler);
