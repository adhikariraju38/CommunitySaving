import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { validatePassword, validateEmail, validatePhone } from '@/lib/auth';
import { withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { UserFilter, PaginatedResponse, IUser } from '@/types';

// GET /api/users - Get all users (Admin only)
export const GET = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    const filters: UserFilter = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '10'), 50), // Max 50 per page
      sortBy: searchParams.get('sortBy') || 'joinDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      role: searchParams.get('role') as 'admin' | 'member' | undefined,
      status: searchParams.get('status') as 'pending' | 'approved' | 'rejected' | undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
    };

    await connectToDatabase();

    // Build query
    const query: any = {};
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { memberId: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters.fromDate || filters.toDate) {
      query.joinDate = {};
      if (filters.fromDate) {
        query.joinDate.$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        query.joinDate.$lte = new Date(filters.toDate);
      }
    }

    // Count total documents
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / filters.limit!);

    // Build sort object
    const sortObj: any = {};
    sortObj[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Get paginated users
    const users = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip((filters.page! - 1) * filters.limit!)
      .limit(filters.limit!)
      .lean();

    const response: PaginatedResponse<IUser> = {
      data: users as unknown as IUser[],
      pagination: {
        current: filters.page!,
        total,
        pages: totalPages,
        hasNext: filters.page! < totalPages,
        hasPrev: filters.page! > 1,
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  })
);

// POST /api/users - Create new user (Admin only)
export const POST = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const { name, email, password, phone, role } = await request.json();

    // Validation
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { success: false, message: 'Name, email, password, and phone are required' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.message },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    if (role && !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone.trim() }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email or phone already exists' },
        { status: 409 }
      );
    }

    // Generate member ID
    const memberId = await User.generateMemberId();

    // Create user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      memberId,
      role: role || 'member',
      isActive: true,
      joinDate: new Date(),
    });

    const savedUser = await newUser.save();

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        memberId: savedUser.memberId,
        phone: savedUser.phone,
        isActive: savedUser.isActive,
        joinDate: savedUser.joinDate,
      },
    }, { status: 201 });
  })
);
