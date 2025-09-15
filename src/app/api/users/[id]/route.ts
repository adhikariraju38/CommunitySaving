import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { validatePassword, validateEmail, validatePhone } from '@/lib/auth';
import { withAdmin, withSelfOrAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';

// GET /api/users/[id] - Get user by ID (Self or Admin)
export const GET = withErrorHandling(
  withSelfOrAdmin((req: NextRequest) => {
    const segments = req.nextUrl.pathname.split('/');
    return segments[segments.length - 1]; // Get the ID from URL
  })(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const userId = segments[segments.length - 1];

    await connectToDatabase();

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
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
    });
  })
);

// PUT /api/users/[id] - Update user (Admin only)
export const PUT = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const userId = segments[segments.length - 1];
    
    const updates = await request.json();
    const { name, email, phone, role, isActive, password } = updates;

    // Validation
    if (email && !validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (phone && !validatePhone(phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { success: false, message: passwordValidation.message },
          { status: 400 }
        );
      }
    }

    if (role && !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check for duplicate email/phone if changed
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: userId }
      });
      
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ 
        phone: phone.trim(),
        _id: { $ne: userId }
      });
      
      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: 'Phone number already in use' },
          { status: 409 }
        );
      }
    }

    // Update fields
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone) user.phone = phone.trim();
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = password; // Will be hashed by pre-save middleware

    const updatedUser = await user.save();

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        memberId: updatedUser.memberId,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
        joinDate: updatedUser.joinDate,
        lastLogin: updatedUser.lastLogin,
      },
    });
  })
);

// DELETE /api/users/[id] - Delete user (Admin only)
export const DELETE = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const userId = segments[segments.length - 1];

    // Prevent admin from deleting themselves
    if (userId === request.user.userId) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has active loans or contributions
    const Loan = (await import('@/models/Loan')).default;
    const Contribution = (await import('@/models/Contribution')).default;

    const hasActiveLoans = await Loan.findOne({
      userId,
      status: { $in: ['approved', 'disbursed'] }
    });

    if (hasActiveLoans) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete user with active loans' },
        { status: 400 }
      );
    }

    const hasContributions = await Contribution.findOne({ userId });
    
    if (hasContributions) {
      // Instead of hard delete, deactivate the user
      user.isActive = false;
      await user.save();
      
      return NextResponse.json({
        success: true,
        message: 'User deactivated successfully (has contribution history)',
      });
    }

    // Hard delete if no financial records
    await User.findByIdAndDelete(userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  })
);
