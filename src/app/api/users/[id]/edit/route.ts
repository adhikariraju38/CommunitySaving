import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { validatePassword, validateEmail, validatePhone } from '@/lib/auth';
import { IMemberEdit } from '@/types';

interface Context {
    params: {
        id: string;
    };
}

// PUT /api/users/[id]/edit - Edit member details (Admin only)
const putHandler = withAuth(async (request: AuthenticatedRequest, context: Context) => {
    try {
        await connectDB();

        // Only admin can edit members
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { id } = context.params;
        const updateData: IMemberEdit = await request.json();

        // Find the user to update
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Validation
        if (updateData.name !== undefined) {
            if (!updateData.name || !updateData.name.trim()) {
                return NextResponse.json(
                    { success: false, error: 'Name cannot be empty' },
                    { status: 400 }
                );
            }
        }

        if (updateData.email !== undefined) {
            if (updateData.email && !validateEmail(updateData.email)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid email format' },
                    { status: 400 }
                );
            }

            // Check if email already exists (excluding current user)
            if (updateData.email) {
                const existingEmailUser = await User.findOne({
                    email: updateData.email.toLowerCase().trim(),
                    _id: { $ne: id }
                });

                if (existingEmailUser) {
                    return NextResponse.json(
                        { success: false, error: 'Email already exists' },
                        { status: 409 }
                    );
                }
            }
        }

        if (updateData.phone !== undefined) {
            if (!updateData.phone || !validatePhone(updateData.phone)) {
                return NextResponse.json(
                    { success: false, error: 'Valid phone number is required' },
                    { status: 400 }
                );
            }

            // Check if phone already exists (excluding current user)
            const existingPhoneUser = await User.findOne({
                phone: updateData.phone.trim(),
                _id: { $ne: id }
            });

            if (existingPhoneUser) {
                return NextResponse.json(
                    { success: false, error: 'Phone number already exists' },
                    { status: 409 }
                );
            }
        }

        if (updateData.password !== undefined) {
            if (updateData.password) {
                const passwordValidation = validatePassword(updateData.password);
                if (!passwordValidation.isValid) {
                    return NextResponse.json(
                        { success: false, error: passwordValidation.message },
                        { status: 400 }
                    );
                }
            }
        }

        // Prepare update object
        const updateObject: any = {};

        if (updateData.name !== undefined) {
            updateObject.name = updateData.name.trim();
        }

        if (updateData.email !== undefined) {
            updateObject.email = updateData.email ? updateData.email.toLowerCase().trim() : null;
        }

        if (updateData.phone !== undefined) {
            updateObject.phone = updateData.phone.trim();
        }

        if (updateData.password !== undefined) {
            updateObject.password = updateData.password || null;
        }

        if (updateData.isActive !== undefined) {
            updateObject.isActive = updateData.isActive;
        }

        // Update the user
        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateObject,
            { new: true, runValidators: false } // We handle validation above
        );

        if (!updatedUser) {
            return NextResponse.json(
                { success: false, error: 'Failed to update user' },
                { status: 500 }
            );
        }

        // Return updated user data (excluding password)
        const userData = {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            memberId: updatedUser.memberId,
            role: updatedUser.role,
            status: updatedUser.status,
            isActive: updatedUser.isActive,
            hasLoginAccess: updatedUser.hasLoginAccess,
            joinDate: updatedUser.joinDate,
            lastLogin: updatedUser.lastLogin,
        };

        return NextResponse.json({
            success: true,
            data: { user: userData },
            message: 'Member updated successfully'
        });

    } catch (error) {
        console.error('Error updating member:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const PUT = withErrorHandling(putHandler);
