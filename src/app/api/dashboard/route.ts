import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Contribution from '@/models/Contribution';
import Loan from '@/models/Loan';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { IDashboardStats, IMemberStats } from '@/types';

// GET /api/dashboard - Get dashboard statistics
export const GET = withErrorHandling(
  withAuth(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    await connectToDatabase();

    if (request.user.role === 'admin') {
      // Admin dashboard - overview of entire system
      const [
        totalSavingsResult,
        totalLoansResult,
        outstandingLoansResult,
        interestCollected,
        totalMembers,
        activeMembers,
        currentMonthStats,
        activeLoansPrincipalResult,
        totalInterestEarnedResult,
        expectedYearlyInterestResult,
        accruedInterestResult
      ] = await Promise.all([
        // Total savings (all paid contributions)
        Contribution.aggregate([
          { $match: { paidStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        
        // Total loans given
        Loan.getTotalLoansGiven(),
        
        // Outstanding loans
        Loan.getOutstandingLoans(),
        
        // Interest collected
        Loan.getInterestCollected(),
        
        // Total members count
        User.countDocuments(),
        
        // Active members count
        User.countDocuments({ isActive: true }),
        
        // Current month contribution stats
        Contribution.getMonthlyStats(new Date().getFullYear(), new Date().getMonth() + 1),

        // Outstanding loans principal (remaining balance)
        Loan.aggregate([
          { 
            $match: { 
              status: { $in: ['approved', 'disbursed'] },
              remainingBalance: { $gt: 0 }
            } 
          },
          {
            $group: {
              _id: null,
              totalPrincipal: { $sum: '$remainingBalance' }
            }
          }
        ]),

        // Total interest earned (from repayments)
        mongoose.model('Repayment').aggregate([
          {
            $group: {
              _id: null,
              totalInterest: { $sum: '$interestAmount' }
            }
          }
        ]),

        // Expected yearly interest from active loans
        Loan.aggregate([
          { 
            $match: { 
              status: { $in: ['approved', 'disbursed'] },
              remainingBalance: { $gt: 0 }
            } 
          },
          {
            $group: {
              _id: null,
              expectedInterest: { 
                $sum: { 
                  $multiply: ['$approvedAmount', { $divide: ['$interestRate', 100] }] 
                } 
              }
            }
          }
        ]),
        
        // Calculate accrued interest from loan start dates to today
        Loan.aggregate([
          { 
            $match: { 
              status: { $in: ['disbursed'] },
              remainingBalance: { $gt: 0 },
              disbursementDate: { $exists: true }
            } 
          },
          {
            $addFields: {
              daysSinceStart: {
                $divide: [
                  { $subtract: [new Date(), '$disbursementDate'] },
                  1000 * 60 * 60 * 24 // Convert milliseconds to days
                ]
              },
              dailyInterestRate: { $divide: ['$interestRate', 365] }
            }
          },
          {
            $group: {
              _id: null,
              totalAccruedInterest: { 
                $sum: { 
                  $multiply: [
                    '$approvedAmount',
                    { $divide: ['$dailyInterestRate', 100] },
                    '$daysSinceStart'
                  ]
                } 
              }
            }
          }
        ])
      ]);

      const totalSavings = totalSavingsResult[0]?.total || 0;
      const outstandingLoanPrincipal = activeLoansPrincipalResult[0]?.totalPrincipal || 0;
      const totalInterestEarned = totalInterestEarnedResult[0]?.totalInterest || 0;
      const expectedYearlyInterest = expectedYearlyInterestResult[0]?.expectedInterest || 0;
      const accruedInterestToDate = accruedInterestResult[0]?.totalAccruedInterest || 0;
      
      // Available funds = contributions + interest earned - money currently loaned out
      const availableFunds = totalSavings + totalInterestEarned - outstandingLoanPrincipal;
      
      // Total Community Value = Available Funds + Outstanding Loans + Accrued Interest to Date
      // This represents: liquid funds + loaned principal + interest accrued from loan start dates
      const totalCommunityValue = availableFunds + outstandingLoanPrincipal + accruedInterestToDate;
      
      const loanToSavingsRatio = totalSavings > 0 ? (outstandingLoanPrincipal / totalSavings) * 100 : 0;

      const stats: IDashboardStats = {
        totalSavings,
        totalLoansGiven: totalLoansResult.totalAmount || 0,
        outstandingLoans: outstandingLoansResult.totalOutstanding || 0,
        interestCollected: interestCollected || 0,
        totalMembers,
        activeMembers,
        monthlyContributions: currentMonthStats.paid.totalAmount || 0,
        overduePayments: currentMonthStats.overdue.count || 0,
        // Enhanced financial metrics
        totalCommunityValue,
        availableFunds,
        expectedYearlyInterest,
        totalInterestEarned,
        activeLoansPrincipal: outstandingLoanPrincipal,
        loanToSavingsRatio,
      };

      return NextResponse.json({
        success: true,
        stats,
        monthlyBreakdown: currentMonthStats,
      });

    } else {
      // Member dashboard - personal statistics
      const targetUserId = userId || request.user.userId;
      
      // Members can only access their own data
      if (request.user.role === 'member' && targetUserId !== request.user.userId) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }

      const [
        savingsResult,
        currentLoan,
        loanHistory,
        contributionHistory
      ] = await Promise.all([
        // User's total savings
        Contribution.getUserTotalSavings(targetUserId),
        
        // Current active loan
        Loan.getUserCurrentLoan(targetUserId),
        
        // Loan history
        Loan.getUserLoanHistory(targetUserId),
        
        // Contribution history (last 12 months)
        Contribution.find({ userId: targetUserId })
          .sort({ month: -1 })
          .limit(12)
          .populate('recordedBy', 'name')
      ]);

      const memberStats: IMemberStats = {
        totalSavings: savingsResult.totalSavings || 0,
        currentLoan: currentLoan || undefined,
        loanHistory: loanHistory || [],
        contributionHistory: contributionHistory || [],
        savingsBalance: savingsResult.totalSavings || 0, // Same as total savings for now
      };

      return NextResponse.json({
        success: true,
        stats: memberStats,
      });
    }
  })
);
