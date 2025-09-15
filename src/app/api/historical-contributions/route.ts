import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Contribution from '@/models/Contribution';
import { withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import mongoose from 'mongoose';
import { COMMUNITY_CONFIG, getRequiredContributionStartDate } from '@/config/community';

// POST /api/historical-contributions - Create historical contributions (Admin only)
export const POST = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const { 
      userId, 
      months, // Array of month strings in YYYY-MM format
      amount,
      paymentMethod,
      notes,
      markAsPaid = false // Whether to mark as paid immediately
    } = await request.json();

    if (!userId || !months || !Array.isArray(months) || months.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User ID and months array are required' },
        { status: 400 }
      );
    }

    if (!amount || amount < 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const contributionsToCreate = [];
    const existingContributions = [];
    const errors = [];

    // Check each month and create contributions
    for (const month of months) {
      try {
        // Validate month format
        if (!/^\d{4}-\d{2}$/.test(month)) {
          errors.push(`Invalid month format: ${month}`);
          continue;
        }

        // Check if contribution already exists
        const existing = await Contribution.findOne({
          userId: userId,
          month: month
        });

        if (existing) {
          existingContributions.push(month);
          continue;
        }

        const [year] = month.split('-');
        
        contributionsToCreate.push({
          userId: userId,
          amount: amount,
          month: month,
          year: parseInt(year),
          paidStatus: markAsPaid ? 'paid' : 'pending',
          paidDate: markAsPaid ? new Date() : undefined,
          paymentMethod: markAsPaid ? paymentMethod : undefined,
          notes: notes?.trim(),
          recordedBy: markAsPaid ? new mongoose.Types.ObjectId(request.user.userId) : undefined
        });

      } catch (error) {
        errors.push(`Error processing month ${month}: ${error}`);
      }
    }

    let createdContributions: any[] = [];
    if (contributionsToCreate.length > 0) {
      try {
        createdContributions = await Contribution.insertMany(contributionsToCreate);
        
        // Populate user details for response
        for (let contribution of createdContributions) {
          await contribution.populate('userId', 'name email memberId');
          if (contribution.recordedBy) {
            await contribution.populate('recordedBy', 'name');
          }
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, message: `Failed to create contributions: ${error}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdContributions.length} historical contributions`,
      data: {
        created: createdContributions,
        existing: existingContributions,
        errors: errors
      }
    });
  })
);

// GET /api/historical-contributions - Get user's contribution status (Admin only)
export const GET = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify user exists
    const user = await User.findById(userId).select('name email memberId joinDate');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get all contributions for this user
    const existingContributions = await Contribution.find({ userId })
      .sort({ month: -1 })
      .populate('recordedBy', 'name');

    // Generate required months (from community opening date or join date, whichever is later)
    const joinDate = new Date(user.joinDate);
    const currentDate = new Date();
    const requiredMonths = [];
    const missingMonths = [];
    
    // Start from community opening date or member join date (whichever is later)
    const startDate = getRequiredContributionStartDate(user.joinDate);
    startDate.setDate(1); // First day of month
    
    // Generate all months from start date to current month
    const tempDate = new Date(startDate);
    while (tempDate <= currentDate) {
      const monthStr = tempDate.toISOString().slice(0, 7); // YYYY-MM
      requiredMonths.push({
        month: monthStr,
        year: tempDate.getFullYear(),
        monthName: tempDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });

      // Check if this month exists in contributions
      const existingContribution = existingContributions.find(c => c.month === monthStr);
      if (!existingContribution) {
        missingMonths.push({
          month: monthStr,
          year: tempDate.getFullYear(),
          monthName: tempDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        });
      }

      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    // Calculate totals
    const totalRequired = requiredMonths.length * COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT;
    const totalMissing = missingMonths.length * COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT;
    const totalPaid = existingContributions
      .filter(c => c.paidStatus === 'paid')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalPending = existingContributions
      .filter(c => c.paidStatus === 'pending')
      .reduce((sum, c) => sum + c.amount, 0);

    // User is current if no missing months
    const isCurrent = missingMonths.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          memberId: user.memberId,
          joinDate: user.joinDate
        },
        contributionStatus: {
          isCurrent,
          totalRequired,
          totalMissing,
          totalPaid,
          totalPending,
          requiredMonthsCount: requiredMonths.length,
          missingMonthsCount: missingMonths.length,
          paidMonthsCount: existingContributions.filter(c => c.paidStatus === 'paid').length,
          pendingMonthsCount: existingContributions.filter(c => c.paidStatus === 'pending').length
        },
        requiredMonths,
        missingMonths,
        existingContributions
      }
    });
  })
);
