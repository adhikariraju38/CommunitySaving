import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { validatePhone } from '@/lib/auth';
import { IBulkMemberCreate } from '@/types';

// POST /api/users/bulk-create - Create multiple members without email/password (Admin only)
const postHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can create members in bulk
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { members }: IBulkMemberCreate = await request.json();

        // Validation
        if (!members || !Array.isArray(members) || members.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Members array is required and cannot be empty' },
                { status: 400 }
            );
        }

        if (members.length > 50) {
            return NextResponse.json(
                { success: false, error: 'Cannot create more than 50 members at once' },
                { status: 400 }
            );
        }

        // Validate each member
        const errors: string[] = [];
        const validMembers = [];

        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            const memberErrors: string[] = [];

            if (!member.name || !member.name.trim()) {
                memberErrors.push(`Row ${i + 1}: Name is required`);
            }

            if (!member.phone || !validatePhone(member.phone)) {
                memberErrors.push(`Row ${i + 1}: Valid phone number is required`);
            }

            if (memberErrors.length === 0) {
                validMembers.push({
                    name: member.name.trim(),
                    phone: member.phone.trim(),
                });
            } else {
                errors.push(...memberErrors);
            }
        }

        if (errors.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Validation errors', details: errors },
                { status: 400 }
            );
        }

        // Check for duplicate phones in the request
        const phoneSet = new Set();
        const duplicatePhones: string[] = [];

        for (const member of validMembers) {
            if (phoneSet.has(member.phone)) {
                duplicatePhones.push(member.phone);
            } else {
                phoneSet.add(member.phone);
            }
        }

        if (duplicatePhones.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Duplicate phone numbers found in request',
                    details: duplicatePhones
                },
                { status: 400 }
            );
        }

        // Check for existing users with same phone numbers
        const existingPhones = await User.find({
            phone: { $in: validMembers.map(m => m.phone) }
        }).select('phone');

        if (existingPhones.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Some phone numbers already exist',
                    details: existingPhones.map(u => u.phone)
                },
                { status: 409 }
            );
        }

        // Create members
        const createdMembers = [];
        const creationErrors = [];

        for (const member of validMembers) {
            try {
                // Generate unique member ID
                const memberId = await User.generateMemberId();

                const newUser = await User.create({
                    name: member.name,
                    phone: member.phone,
                    memberId,
                    role: 'member',
                    status: 'approved', // Directly approved by admin
                    isActive: true,
                    hasLoginAccess: false, // No email/password initially
                    // Explicitly exclude email and password to avoid null constraint issues
                });

                createdMembers.push({
                    _id: newUser._id,
                    name: newUser.name,
                    phone: newUser.phone,
                    memberId: newUser.memberId,
                    role: newUser.role,
                    status: newUser.status,
                    isActive: newUser.isActive,
                    hasLoginAccess: newUser.hasLoginAccess,
                    joinDate: newUser.joinDate,
                });
            } catch (error: any) {
                creationErrors.push(`Failed to create member ${member.name}: ${error.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                created: createdMembers,
                totalCreated: createdMembers.length,
                totalRequested: validMembers.length,
                errors: creationErrors
            },
            message: `Successfully created ${createdMembers.length} out of ${validMembers.length} members`
        });

    } catch (error) {
        console.error('Error creating bulk members:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const POST = withErrorHandling(postHandler);
