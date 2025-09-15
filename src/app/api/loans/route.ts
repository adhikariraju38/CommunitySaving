import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import Contribution from '@/models/Contribution';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { LoanFilter, PaginatedResponse, ILoan } from '@/types';
import { addDynamicCalculationsToLoans } from '@/lib/loan-calculations';

// GET /api/loans - Get loans (filtered by user role)
export const GET = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);

    const filters: LoanFilter = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '10'), 50),
      sortBy: searchParams.get('sortBy') || 'requestDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') as any || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
    };

    await connectToDatabase();

    // Build query
    const query: any = {};

    // If member, only show their own loans
    if (request.user.role === 'member') {
      query.userId = request.user.userId;
    } else if (filters.userId) {
      // Admin can filter by specific user
      query.userId = filters.userId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      query.requestDate = {};
      if (filters.fromDate) {
        query.requestDate.$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        query.requestDate.$lte = new Date(filters.toDate);
      }
    }

    // Count total documents
    const total = await Loan.countDocuments(query);
    const totalPages = Math.ceil(total / filters.limit!);

    // Build sort object
    const sortObj: any = {};
    sortObj[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Get paginated loans
    const loans = await Loan.find(query)
      .populate('userId', 'name email memberId')
      .populate('approvedBy', 'name')
      .populate('repayments')
      .sort(sortObj)
      .skip((filters.page! - 1) * filters.limit!)
      .limit(filters.limit!)
      .lean();

    // Apply dynamic calculations to each loan
    const loansWithDynamicCalculations = addDynamicCalculationsToLoans(loans);

    const response: PaginatedResponse<ILoan> = {
      data: loansWithDynamicCalculations as unknown as ILoan[],
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

// POST /api/loans - Request new loan (Members can request, Admins can create)
export const POST = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const {
      requestedAmount,
      purpose,
      expectedRepaymentDate,
      collateral,
      guarantor,
      guarantorContact,
      interestRate,
      userId // Only for admin creating loans for other users
    } = await request.json();

    // Validation
    if (!requestedAmount || !purpose || !expectedRepaymentDate) {
      return NextResponse.json(
        { success: false, message: 'Requested amount, purpose, and expected repayment date are required' },
        { status: 400 }
      );
    }

    if (requestedAmount < 1000 || requestedAmount > 100000) {
      return NextResponse.json(
        { success: false, message: 'Loan amount must be between 1000 and 100000' },
        { status: 400 }
      );
    }

    const repaymentDate = new Date(expectedRepaymentDate);
    const today = new Date();

    if (repaymentDate <= today) {
      return NextResponse.json(
        { success: false, message: 'Repayment date must be in the future' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Determine target user
    let targetUserId = request.user.userId;

    if (request.user.role === 'admin' && userId) {
      // Admin creating loan for another user
      targetUserId = userId;

      const targetUser = await User.findById(userId);
      if (!targetUser || !targetUser.isActive) {
        return NextResponse.json(
          { success: false, message: 'Target user not found or inactive' },
          { status: 404 }
        );
      }
    }

    // Check if user has an active loan
    const existingActiveLoan = await Loan.findOne({
      userId: targetUserId,
      status: { $in: ['approved', 'disbursed'] }
    });

    if (existingActiveLoan) {
      return NextResponse.json(
        { success: false, message: 'User already has an active loan' },
        { status: 400 }
      );
    }

    // Check user's savings eligibility (should have some contribution history)
    const userSavings = await Contribution.getUserTotalSavings(targetUserId);

    if (userSavings.totalSavings === 0) {
      return NextResponse.json(
        { success: false, message: 'User must have contribution history before requesting a loan' },
        { status: 400 }
      );
    }

    // Create loan
    const newLoan = new Loan({
      userId: targetUserId,
      requestedAmount,
      interestRate: interestRate || 16, // Default 16% if not specified
      requestDate: new Date(),
      expectedRepaymentDate: repaymentDate,
      purpose: purpose.trim(),
      collateral: collateral?.trim(),
      guarantor: guarantor?.trim(),
      guarantorContact: guarantorContact?.trim(),
      status: 'pending',
      totalAmountDue: 0, // Will be calculated by pre-save middleware
      amountPaid: 0,
      remainingBalance: 0, // Will be calculated by pre-save middleware
      repayments: [],
    });

    const savedLoan = await newLoan.save();

    await savedLoan.populate('userId', 'name email memberId');

    return NextResponse.json({
      success: true,
      message: 'Loan request submitted successfully',
      loan: savedLoan,
    }, { status: 201 });
  })
);
