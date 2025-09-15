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

            // Phone is now optional, but if provided, it must be valid
            if (member.phone && member.phone.trim() && !validatePhone(member.phone.trim())) {
                memberErrors.push(`Row ${i + 1}: Invalid phone number format`);
            }

            if (memberErrors.length === 0) {
                const validMember: any = {
                    name: member.name.trim(),
                };

                // Only include phone if it's provided and not empty
                if (member.phone && member.phone.trim()) {
                    validMember.phone = member.phone.trim();
                }

                validMembers.push(validMember);
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

        // Check for duplicate phones in the request (only for members with phone numbers)
        const membersWithPhones = validMembers.filter(m => m.phone);
        const phoneSet = new Set();
        const duplicatePhones: string[] = [];

        for (const member of membersWithPhones) {
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

        // Check for existing users with same phone numbers (only check provided phone numbers)
        if (membersWithPhones.length > 0) {
            const existingPhones = await User.find({
                phone: { $in: membersWithPhones.map(m => m.phone) }
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
        }

        // Create members
        const createdMembers = [];
        const creationErrors = [];

        for (const member of validMembers) {
            try {
                // Generate unique member ID
                const memberId = await User.generateMemberId();

                const userData: any = {
                    name: member.name,
                    memberId,
                    role: 'member',
                    status: 'approved', // Directly approved by admin
                    isActive: true,
                    hasLoginAccess: false, // No email/password initially
                    // Explicitly exclude email and password to avoid null constraint issues
                };

                // Only include phone if it was provided
                if (member.phone) {
                    userData.phone = member.phone;
                }

                const newUser = await User.create(userData);

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
