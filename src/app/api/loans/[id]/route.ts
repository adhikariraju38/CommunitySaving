import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Loan from '@/models/Loan';
import { withAuth, withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { addDynamicCalculationsToLoan } from '@/lib/loan-calculations';

// GET /api/loans/[id] - Get loan details
export const GET = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const loanId = segments[segments.length - 1];

    await connectToDatabase();

    const loan = await Loan.findById(loanId)
      .populate('userId', 'name email memberId')
      .populate('approvedBy', 'name')
      .populate('repayments');

    if (!loan) {
      return NextResponse.json(
        { success: false, message: 'Loan not found' },
        { status: 404 }
      );
    }

    // Members can only view their own loans
    if (request.user.role === 'member' && loan.userId._id.toString() !== request.user.userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Apply dynamic calculations to the loan
    const loanWithDynamicCalculations = addDynamicCalculationsToLoan(loan.toObject());

    return NextResponse.json({
      success: true,
      loan: loanWithDynamicCalculations,
    });
  })
);

// PUT /api/loans/[id] - Update loan (Admin only)
export const PUT = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const loanId = segments[segments.length - 1];

    const updates = await request.json();
    const {
      approvedAmount,
      interestRate,
      status,
      rejectionReason,
      disbursementDate
    } = updates;

    await connectToDatabase();

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return NextResponse.json(
        { success: false, message: 'Loan not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'pending': ['approved', 'rejected'],
      'approved': ['disbursed', 'rejected'],
      'disbursed': ['completed'],
      'rejected': [], // Cannot change rejected loans
      'completed': [], // Cannot change completed loans
    };

    if (status && !validTransitions[loan.status].includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status transition from ${loan.status} to ${status}` },
        { status: 400 }
      );
    }

    // Update loan fields
    if (approvedAmount !== undefined) {
      if (approvedAmount > loan.requestedAmount) {
        return NextResponse.json(
          { success: false, message: 'Approved amount cannot exceed requested amount' },
          { status: 400 }
        );
      }
      loan.approvedAmount = approvedAmount;
    }

    if (interestRate !== undefined) {
      if (interestRate < 0 || interestRate > 100) {
        return NextResponse.json(
          { success: false, message: 'Interest rate must be between 0 and 100' },
          { status: 400 }
        );
      }
      loan.interestRate = interestRate;
    }

    if (status) {
      loan.status = status;

      // Set approvedBy when approving
      if (status === 'approved' || status === 'disbursed') {
        loan.approvedBy = new mongoose.Types.ObjectId(request.user.userId);
      }
    }

    if (rejectionReason && status === 'rejected') {
      loan.rejectionReason = rejectionReason.trim();
    }

    if (disbursementDate && status === 'disbursed') {
      loan.disbursementDate = new Date(disbursementDate);
    }

    const updatedLoan = await loan.save();
    await updatedLoan.populate('userId', 'name email memberId');
    await updatedLoan.populate('approvedBy', 'name');

    return NextResponse.json({
      success: true,
      message: 'Loan updated successfully',
      loan: updatedLoan,
    });
  })
);

// DELETE /api/loans/[id] - Delete loan (Admin only, only pending loans)
export const DELETE = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const loanId = segments[segments.length - 1];

    await connectToDatabase();

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return NextResponse.json(
        { success: false, message: 'Loan not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of pending loans
    if (loan.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Only pending loans can be deleted' },
        { status: 400 }
      );
    }

    await Loan.findByIdAndDelete(loanId);

    return NextResponse.json({
      success: true,
      message: 'Loan deleted successfully',
    });
  })
);
