import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Loan from '@/models/Loan';
import { withAuth, withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';

// PATCH /api/loans/[id]/approval-date - Update loan approval date (Admin only)
export const PATCH = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const loanId = segments[segments.length - 2]; // Get loan ID from path
    
    const { approvalDate } = await request.json();

    if (!approvalDate) {
      return NextResponse.json(
        { success: false, message: 'Approval date is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return NextResponse.json(
        { success: false, message: 'Loan not found' },
        { status: 404 }
      );
    }

    // Only allow updating approval date for approved or disbursed loans
    if (!['approved', 'disbursed'].includes(loan.status)) {
      return NextResponse.json(
        { success: false, message: 'Can only update approval date for approved or disbursed loans' },
        { status: 400 }
      );
    }

    // Validate that the approval date is not in the future
    const approvalDateObj = new Date(approvalDate);
    const now = new Date();
    
    if (approvalDateObj > now) {
      return NextResponse.json(
        { success: false, message: 'Approval date cannot be in the future' },
        { status: 400 }
      );
    }

    // Update the approval date
    loan.approvalDate = approvalDateObj;
    await loan.save();

    return NextResponse.json({
      success: true,
      message: 'Approval date updated successfully',
      loan: {
        _id: loan._id,
        approvalDate: loan.approvalDate,
      },
    });
  })
);
