import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Contribution from '@/models/Contribution';
import Loan from '@/models/Loan';

// GET /api/reports - Generate various reports (Admin only)
const getHandler = withAuth(async (request: AuthenticatedRequest) => {
  try {
    await connectDB();

    // Only admin can generate reports
    if (request.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const format = searchParams.get('format') || 'csv';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = await generateUsersReport(status);
        filename = `users_report`;
        break;
      case 'contributions':
        data = await generateContributionsReport(dateFrom, dateTo, status);
        filename = `contributions_report`;
        break;
      case 'loans':
        data = await generateLoansReport(dateFrom, dateTo, status);
        filename = `loans_report`;
        break;
      case 'financial-summary':
        data = await generateFinancialSummaryReport(dateFrom, dateTo);
        filename = `financial_summary_report`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      const csvContent = convertToCSV(data);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data,
        report: {
          type,
          generatedAt: new Date().toISOString(),
          recordCount: data.length,
        },
      });
    }

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

async function generateUsersReport(status?: string | null) {
  const query: any = {};
  if (status) {
    query.status = status;
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ joinDate: -1 })
    .lean();

  return users.map(user => ({
    memberId: user.memberId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    isActive: user.isActive ? 'Yes' : 'No',
    joinDate: new Date(user.joinDate).toLocaleDateString(),
    lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
  }));
}

async function generateContributionsReport(dateFrom?: string | null, dateTo?: string | null, status?: string | null) {
  const query: any = {};
  
  if (dateFrom || dateTo) {
    query.paidDate = {};
    if (dateFrom) query.paidDate.$gte = new Date(dateFrom);
    if (dateTo) query.paidDate.$lte = new Date(dateTo);
  }
  
  if (status) {
    query.paidStatus = status;
  }

  const contributions = await Contribution.find(query)
    .populate('userId', 'name email memberId')
    .sort({ month: -1 })
    .lean();

  return contributions.map(contribution => ({
    memberId: (contribution.userId as any)?.memberId || 'N/A',
    memberName: (contribution.userId as any)?.name || 'N/A',
    memberEmail: (contribution.userId as any)?.email || 'N/A',
    amount: contribution.amount,
    month: contribution.month,
    year: contribution.year,
    paidStatus: contribution.paidStatus,
    paidDate: contribution.paidDate ? new Date(contribution.paidDate).toLocaleDateString() : 'Not paid',
    paymentMethod: contribution.paymentMethod || 'N/A',
    notes: contribution.notes || '',
  }));
}

async function generateLoansReport(dateFrom?: string | null, dateTo?: string | null, status?: string | null) {
  const query: any = {};
  
  if (dateFrom || dateTo) {
    query.requestDate = {};
    if (dateFrom) query.requestDate.$gte = new Date(dateFrom);
    if (dateTo) query.requestDate.$lte = new Date(dateTo);
  }
  
  if (status) {
    query.status = status;
  }

  const loans = await Loan.find(query)
    .populate('userId', 'name email memberId')
    .populate('approvedBy', 'name')
    .sort({ requestDate: -1 })
    .lean();

  return loans.map(loan => ({
    memberId: (loan.userId as any)?.memberId || 'N/A',
    memberName: (loan.userId as any)?.name || 'N/A',
    memberEmail: (loan.userId as any)?.email || 'N/A',
    requestedAmount: loan.requestedAmount,
    approvedAmount: loan.approvedAmount || 0,
    interestRate: loan.interestRate || 0,
    totalAmountDue: loan.totalAmountDue || 0,
    remainingBalance: loan.remainingBalance || 0,
    status: loan.status,
    purpose: loan.purpose || '',
    requestDate: new Date(loan.requestDate).toLocaleDateString(),
    approvedBy: (loan.approvedBy as any)?.name || 'N/A',
    repayments: loan.repayments?.length || 0,
  }));
}

async function generateFinancialSummaryReport(dateFrom?: string | null, dateTo?: string | null) {
  const dateQuery: any = {};
  if (dateFrom || dateTo) {
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);
  }

  // Total users
  const totalUsers = await User.countDocuments({ status: 'approved' });
  const activeUsers = await User.countDocuments({ status: 'approved', isActive: true });

  // Contributions summary
  const contributionQuery: any = {};
  if (Object.keys(dateQuery).length > 0) {
    contributionQuery.paidDate = dateQuery;
  }

  const contributionStats = await Contribution.aggregate([
    { $match: contributionQuery },
    {
      $group: {
        _id: null,
        totalContributions: { $sum: '$amount' },
        paidContributions: {
          $sum: {
            $cond: [{ $eq: ['$paidStatus', 'paid'] }, '$amount', 0]
          }
        },
        pendingContributions: {
          $sum: {
            $cond: [{ $eq: ['$paidStatus', 'pending'] }, '$amount', 0]
          }
        },
        totalRecords: { $sum: 1 },
      }
    }
  ]);

  // Loans summary
  const loanQuery: any = {};
  if (Object.keys(dateQuery).length > 0) {
    loanQuery.requestDate = dateQuery;
  }

  const loanStats = await Loan.aggregate([
    { $match: loanQuery },
    {
      $group: {
        _id: null,
        totalRequested: { $sum: '$requestedAmount' },
        totalApproved: { $sum: '$approvedAmount' },
        totalOutstanding: { $sum: '$remainingBalance' },
        totalLoans: { $sum: 1 },
        approvedLoans: {
          $sum: {
            $cond: [{ $in: ['$status', ['approved', 'disbursed', 'closed']] }, 1, 0]
          }
        },
      }
    }
  ]);

  const contribData = contributionStats[0] || {};
  const loanData = loanStats[0] || {};

  return [{
    reportDate: new Date().toLocaleDateString(),
    dateRange: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
    totalUsers,
    activeUsers,
    totalContributions: contribData.totalContributions || 0,
    paidContributions: contribData.paidContributions || 0,
    pendingContributions: contribData.pendingContributions || 0,
    contributionRecords: contribData.totalRecords || 0,
    totalLoanRequested: loanData.totalRequested || 0,
    totalLoanApproved: loanData.totalApproved || 0,
    totalOutstandingBalance: loanData.totalOutstanding || 0,
    totalLoanApplications: loanData.totalLoans || 0,
    approvedLoanCount: loanData.approvedLoans || 0,
    netCashFlow: (contribData.paidContributions || 0) - (loanData.totalApproved || 0),
  }];
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if value contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

export const GET = withErrorHandling(getHandler);
