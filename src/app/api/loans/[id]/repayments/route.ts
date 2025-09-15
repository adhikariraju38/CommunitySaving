import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Loan from '@/models/Loan';
import Repayment from '@/models/Repayment';
import { withAuth, withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';

// GET /api/loans/[id]/repayments - Get loan repayments
export const GET = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const loanId = segments[segments.length - 2]; // Get loan ID from path

    await connectToDatabase();

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return NextResponse.json(
        { success: false, message: 'Loan not found' },
        { status: 404 }
      );
    }

    // Members can only view their own loan repayments
    if (request.user.role === 'member' && loan.userId.toString() !== request.user.userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const repayments = await Repayment.find({ loanId })
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 });

    return NextResponse.json({
      success: true,
      repayments,
    });
  })
);

// POST /api/loans/[id]/repayments - Record loan repayment (Admin only)
export const POST = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const segments = request.nextUrl.pathname.split('/');
    const loanId = segments[segments.length - 2]; // Get loan ID from path
    
    const {
      amount,
      paymentMethod,
      notes,
      paymentDate,
      paymentType, // 'principal', 'interest', 'combined'
      principalAmount,
      interestAmount,
    } = await request.json();

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Payment amount is required and must be positive' },
        { status: 400 }
      );
    }

    if (!paymentType || !['principal', 'interest', 'combined'].includes(paymentType)) {
      return NextResponse.json(
        { success: false, message: 'Payment type must be principal, interest, or combined' },
        { status: 400 }
      );
    }

    // Validate payment breakdown for combined payments
    if (paymentType === 'combined') {
      if (!principalAmount || !interestAmount || principalAmount < 0 || interestAmount < 0) {
        return NextResponse.json(
          { success: false, message: 'Principal and interest amounts must be specified for combined payments' },
          { status: 400 }
        );
      }
      
      if (Math.abs((principalAmount + interestAmount) - amount) > 0.01) {
        return NextResponse.json(
          { success: false, message: 'Principal and interest amounts must sum to total payment amount' },
          { status: 400 }
        );
      }
    }

    await connectToDatabase();

    const loan = await Loan.findById(loanId).populate('userId', 'name email memberId');
    if (!loan) {
      return NextResponse.json(
        { success: false, message: 'Loan not found' },
        { status: 404 }
      );
    }

    if (loan.status !== 'disbursed') {
      return NextResponse.json(
        { success: false, message: 'Can only record payments for disbursed loans' },
        { status: 400 }
      );
    }

    if (loan.remainingBalance <= 0) {
      return NextResponse.json(
        { success: false, message: 'Loan is already fully paid' },
        { status: 400 }
      );
    }

    // Calculate payment breakdown based on type
    let finalPrincipalAmount = 0;
    let finalInterestAmount = 0;

    switch (paymentType) {
      case 'principal':
        finalPrincipalAmount = amount;
        finalInterestAmount = 0;
        break;
      case 'interest':
        finalPrincipalAmount = 0;
        finalInterestAmount = amount;
        break;
      case 'combined':
        finalPrincipalAmount = principalAmount;
        finalInterestAmount = interestAmount;
        break;
    }

    // Validate payment amounts against loan balance
    if (finalPrincipalAmount > loan.remainingBalance) {
      return NextResponse.json(
        { success: false, message: 'Principal payment cannot exceed remaining loan balance' },
        { status: 400 }
      );
    }

    // Create repayment record
    const repayment = new Repayment({
      loanId: new mongoose.Types.ObjectId(loanId),
      userId: loan.userId._id,
      amount: amount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'cash',
      principalAmount: finalPrincipalAmount,
      interestAmount: finalInterestAmount,
      remainingBalance: loan.remainingBalance - finalPrincipalAmount, // Only principal reduces the balance
      recordedBy: new mongoose.Types.ObjectId(request.user.userId),
      notes: notes?.trim(),
    });

    const savedRepayment = await repayment.save();

    // Update loan with new payment
    loan.amountPaid += finalPrincipalAmount; // Only principal counts towards amountPaid
    loan.remainingBalance -= finalPrincipalAmount; // Only principal reduces balance
    
    // Add repayment to loan's repayments array
    loan.repayments.push(savedRepayment._id);
    
    // Check if loan is fully paid
    if (loan.remainingBalance <= 0) {
      loan.status = 'completed';
      loan.actualRepaymentDate = new Date(paymentDate || new Date());
    }

    await loan.save();

    // Populate the saved repayment for response
    await savedRepayment.populate('recordedBy', 'name');

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      repayment: savedRepayment,
      loan: {
        remainingBalance: loan.remainingBalance,
        amountPaid: loan.amountPaid,
        status: loan.status,
      },
    }, { status: 201 });
  })
);
