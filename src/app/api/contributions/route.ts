import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Contribution from '@/models/Contribution';
import User from '@/models/User';
import { withAuth, withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { ContributionFilter, PaginatedResponse, IContribution } from '@/types';

// GET /api/contributions - Get contributions (filtered by user role)
export const GET = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    const filters: ContributionFilter = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '10'), 50),
      sortBy: searchParams.get('sortBy') || 'month',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      userId: searchParams.get('userId') || undefined,
      month: searchParams.get('month') || undefined,
      year: parseInt(searchParams.get('year') || '0') || undefined,
      status: searchParams.get('status') as any || undefined,
    };

    await connectToDatabase();

    // Build query
    const query: any = {};
    
    // If member, only show their own contributions
    if (request.user.role === 'member') {
      query.userId = request.user.userId;
    } else if (filters.userId) {
      // Admin can filter by specific user
      query.userId = filters.userId;
    }
    
    if (filters.month) {
      query.month = filters.month;
    }
    
    if (filters.year) {
      query.year = filters.year;
    }
    
    if (filters.status) {
      query.paidStatus = filters.status;
    }

    // Count total documents
    const total = await Contribution.countDocuments(query);
    const totalPages = Math.ceil(total / filters.limit!);

    // Build sort object
    const sortObj: any = {};
    sortObj[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Get paginated contributions
    const contributions = await Contribution.find(query)
      .populate('userId', 'name email memberId')
      .populate('recordedBy', 'name')
      .sort(sortObj)
      .skip((filters.page! - 1) * filters.limit!)
      .limit(filters.limit!)
      .lean();

    const response: PaginatedResponse<IContribution> = {
      data: contributions as unknown as IContribution[],
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

// POST /api/contributions - Create monthly contributions or record payment (Admin only)
export const POST = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    const { action, ...data } = await request.json();

    await connectToDatabase();

    if (action === 'create-monthly') {
      // Create monthly contributions for selected or all active members
      const { year, month, selectedUserIds } = data;
      
      if (!year || !month) {
        return NextResponse.json(
          { success: false, message: 'Year and month are required' },
          { status: 400 }
        );
      }

      let contributions: any[] = [];
      if (selectedUserIds && Array.isArray(selectedUserIds) && selectedUserIds.length > 0) {
        // Create contributions for selected users only
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const contributionsToCreate: any[] = [];
        
        for (const userId of selectedUserIds) {
          // Check if contribution already exists
          const existing = await Contribution.findOne({
            userId: userId,
            month: monthStr,
          });
          
          if (!existing) {
            // Verify user exists and is active
            const user = await User.findOne({ _id: userId, isActive: true, role: 'member' });
            if (user) {
              contributionsToCreate.push({
                userId: userId,
                amount: 2000,
                month: monthStr,
                year,
                paidStatus: 'pending',
              });
            }
          }
        }
        
        if (contributionsToCreate.length > 0) {
          contributions = await Contribution.insertMany(contributionsToCreate);
        }
      } else {
        // Use existing method for all active members
        contributions = await Contribution.createMonthlyContributions(year, parseInt(month));
      }
      
      return NextResponse.json({
        success: true,
        message: `Created ${contributions.length} monthly contributions`,
        contributions,
      }, { status: 201 });
    }

    if (action === 'record-payment') {
      // Record individual contribution payment (Admin only - marks as paid directly)
      const {
        userId,
        month,
        amount,
        paymentMethod,
        notes
      } = data;

      if (!userId || !month) {
        return NextResponse.json(
          { success: false, message: 'User ID and month are required' },
          { status: 400 }
        );
      }

      // Find the contribution record
      const contribution = await Contribution.findOne({ userId, month });
      
      if (!contribution) {
        return NextResponse.json(
          { success: false, message: 'Contribution record not found' },
          { status: 404 }
        );
      }

      if (contribution.paidStatus === 'paid') {
        return NextResponse.json(
          { success: false, message: 'Contribution already paid' },
          { status: 400 }
        );
      }

      // Admin recording - mark as paid directly
      contribution.paidStatus = 'paid';
      contribution.paidDate = new Date();
      contribution.amount = amount || contribution.amount;
      contribution.paymentMethod = paymentMethod;
      contribution.notes = notes?.trim();
      contribution.recordedBy = new mongoose.Types.ObjectId(request.user.userId);

      await contribution.save();
      await contribution.populate('userId', 'name email memberId');
      await contribution.populate('recordedBy', 'name');

      return NextResponse.json({
        success: true,
        message: 'Payment recorded successfully',
        contribution,
      });
    }

    if (action === 'approve-contribution') {
      // Admin approves a pending contribution
      const { contributionId } = data;

      if (!contributionId) {
        return NextResponse.json(
          { success: false, message: 'Contribution ID is required' },
          { status: 400 }
        );
      }

      const contribution = await Contribution.findById(contributionId);
      
      if (!contribution) {
        return NextResponse.json(
          { success: false, message: 'Contribution not found' },
          { status: 404 }
        );
      }

      if (contribution.paidStatus === 'paid') {
        return NextResponse.json(
          { success: false, message: 'Contribution already approved' },
          { status: 400 }
        );
      }

      // Approve the contribution
      contribution.paidStatus = 'paid';
      contribution.recordedBy = new mongoose.Types.ObjectId(request.user.userId);

      await contribution.save();
      await contribution.populate('userId', 'name email memberId');
      await contribution.populate('recordedBy', 'name');

      return NextResponse.json({
        success: true,
        message: 'Contribution approved successfully',
        contribution,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  })
);

// PATCH /api/contributions - Member contribution recording (Members only)
export const PATCH = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const { action, ...data } = await request.json();

    await connectToDatabase();

    if (action === 'member-contribute') {
      // Member self-contribution (marks as pending for admin approval)
      const {
        month,
        amount,
        paymentMethod,
        notes
      } = data;

      if (!month) {
        return NextResponse.json(
          { success: false, message: 'Month is required' },
          { status: 400 }
        );
      }

      // Find the contribution record for the current user
      const contribution = await Contribution.findOne({ 
        userId: request.user.userId, 
        month 
      });
      
      if (!contribution) {
        return NextResponse.json(
          { success: false, message: 'No contribution record found for this month. Contact admin to setup contributions.' },
          { status: 404 }
        );
      }

      if (contribution.paidStatus === 'paid') {
        return NextResponse.json(
          { success: false, message: 'Contribution already recorded and approved' },
          { status: 400 }
        );
      }

      // Member contribution - mark as pending for admin approval
      contribution.paidStatus = 'pending';
      contribution.paidDate = new Date();
      contribution.amount = amount || contribution.amount;
      contribution.paymentMethod = paymentMethod;
      contribution.notes = notes?.trim();
      // Don't set recordedBy for member contributions until admin approves

      await contribution.save();
      await contribution.populate('userId', 'name email memberId');

      return NextResponse.json({
        success: true,
        message: 'Contribution submitted for admin approval',
        contribution,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  })
);
