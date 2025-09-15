import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Contribution from '@/models/Contribution';
import Loan from '@/models/Loan';
import Repayment from '@/models/Repayment';
import HistoricalInterest from '@/models/HistoricalInterest';
import { withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { CommunityFinances, LoanSummary } from '@/types';

// GET /api/community-finances - Get detailed community financial breakdown (Admin only)
export const GET = withErrorHandling(
  withAdmin(async (request: AuthenticatedRequest) => {
    await connectToDatabase();

    const [
      // Total contributions all time
      totalContributionsResult,

      // Active loans with details
      activeLoansResult,

      // All loans for loan summaries
      allLoansResult,

      // Total interest collected from repayments
      totalInterestResult,

      // Historical interest collected
      historicalInterestResult,

      // Monthly financial history (last 12 months)
      monthlyHistoryResult,
    ] = await Promise.all([
      // Total contributions all time
      Contribution.aggregate([
        { $match: { paidStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Active loans with principals
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
            totalPrincipal: { $sum: '$approvedAmount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // All loans with user details for loan summaries
      Loan.find({
        status: { $in: ['approved', 'disbursed', 'completed'] },
        approvedAmount: { $gt: 0 }
      })
        .populate('userId', 'name memberId')
        .populate('repayments')
        .lean(),

      // Total interest collected from repayments
      Repayment.aggregate([
        {
          $group: {
            _id: null,
            totalInterest: { $sum: '$interestAmount' }
          }
        }
      ]),

      // Historical interest collected
      HistoricalInterest.getTotalHistoricalInterest(),

      // Monthly history for last 12 months
      getMonthlyFinancialHistory()
    ]);

    const totalContributions = totalContributionsResult[0]?.total || 0;
    const activeLoansPrincipal = activeLoansResult[0]?.totalPrincipal || 0;
    const totalInterestFromRepayments = totalInterestResult[0]?.totalInterest || 0;
    const historicalInterest = historicalInterestResult || 0;

    // Total interest collected includes both repayment interest and historical interest
    const totalInterestCollected = totalInterestFromRepayments + historicalInterest;

    // Calculate available funds (contributions + all interest earned - active loan principals)
    const availableLiquidFunds = totalContributions + totalInterestCollected - activeLoansPrincipal;

    // Calculate expected annual interest from active loans
    let expectedAnnualInterest = 0;
    const loanSummaries: LoanSummary[] = [];

    for (const loan of allLoansResult) {
      const user = loan.userId as any;
      const approvedAmount = loan.approvedAmount || 0;
      const interestRate = loan.interestRate || 16;
      const yearlyInterestAmount = (approvedAmount * interestRate) / 100;

      // Calculate total interest earned from this loan
      const totalInterestEarned = loan.repayments?.reduce((sum: number, repaymentId: any) => {
        // Find repayment details - this would need to be populated
        return sum;
      }, 0) || 0;

      if (loan.status === 'approved' || loan.status === 'disbursed') {
        expectedAnnualInterest += yearlyInterestAmount;
      }

      loanSummaries.push({
        borrowerName: user?.name || 'Unknown',
        borrowerMemberId: user?.memberId || 'Unknown',
        principalAmount: approvedAmount,
        interestRate,
        yearlyInterestAmount,
        totalInterestEarned: 0, // Would need to calculate from repayments
        remainingBalance: loan.remainingBalance || 0,
        loanStartDate: loan.approvalDate || loan.requestDate,
        status: loan.status
      });
    }

    const finances: CommunityFinances = {
      totalContributionsAllTime: totalContributions,
      totalActiveLoans: activeLoansPrincipal,
      totalInterestCollected,
      availableLiquidFunds,
      expectedAnnualInterest,
      loanSummaries,
      monthlyFinancialHistory: monthlyHistoryResult
    };

    return NextResponse.json({
      success: true,
      data: finances
    });
  })
);

async function getMonthlyFinancialHistory() {
  const months = [];
  const now = new Date();

  // Get last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const [contributions, loansGiven, interestCollected, historicalInterestForMonth] = await Promise.all([
      // Contributions for this month
      Contribution.aggregate([
        {
          $match: {
            month: monthStr,
            paidStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Loans approved/disbursed in this month
      Loan.aggregate([
        {
          $match: {
            $or: [
              { approvalDate: { $gte: date, $lt: new Date(year, month, 1) } },
              { disbursementDate: { $gte: date, $lt: new Date(year, month, 1) } }
            ],
            status: { $in: ['approved', 'disbursed', 'completed'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$approvedAmount' }
          }
        }
      ]),

      // Interest collected from repayments in this month
      Repayment.aggregate([
        {
          $match: {
            paymentDate: { $gte: date, $lt: new Date(year, month, 1) }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$interestAmount' }
          }
        }
      ]),

      // Historical interest for this month
      HistoricalInterest.aggregate([
        {
          $match: {
            interestDate: { $gte: date, $lt: new Date(year, month, 1) }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const contributionsAmount = contributions[0]?.total || 0;
    const loansAmount = loansGiven[0]?.total || 0;
    const repaymentInterestAmount = interestCollected[0]?.total || 0;
    const historicalInterestAmount = historicalInterestForMonth[0]?.total || 0;

    // Total interest for the month includes both repayment and historical interest
    const totalInterestAmount = repaymentInterestAmount + historicalInterestAmount;

    months.push({
      month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      contributions: contributionsAmount,
      loansGiven: loansAmount,
      interestCollected: totalInterestAmount,
      netGrowth: contributionsAmount + totalInterestAmount - loansAmount
    });
  }

  return months;
}
