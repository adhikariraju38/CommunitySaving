import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { validatePassword, validateEmail, validatePhone } from '@/lib/auth';

// POST /api/users/create-member - Create a new approved member (Admin only)
const postHandler = withAuth(async (request: AuthenticatedRequest) => {
  try {
    await connectDB();

    // Only admin can create members directly
    if (request.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { name, email, phone, password } = await request.json();

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Phone is optional, but if provided, it must be valid
    if (phone && !validatePhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if email or phone already exists
    const orConditions = [{ email: email.toLowerCase().trim() }];

    // Only check phone if it's provided
    if (phone && phone.trim()) {
      orConditions.push({ phone: phone.trim() });
    }

    const existingUser = await User.findOne({
      $or: orConditions
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email or phone number already registered' },
        { status: 409 }
      );
    }

    // Generate unique member ID
    const memberId = await User.generateMemberId();

    // Create new approved member
    const userData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      memberId,
      role: 'member',
      status: 'approved', // Directly approved by admin
      isActive: true,
    };

    // Only include phone if provided
    if (phone && phone.trim()) {
      userData.phone = phone.trim();
    }

    const newUser = await User.create(userData);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          memberId: newUser.memberId,
          role: newUser.role,
          status: newUser.status,
          isActive: newUser.isActive,
          joinDate: newUser.joinDate,
        }
      },
      message: 'Member created successfully'
    });

  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withErrorHandling(postHandler);
