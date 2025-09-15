import { Document, Types } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  memberId: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  joinDate: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserRegister extends Omit<IUser, '_id' | 'comparePassword' | 'lastLogin'> {
  confirmPassword: string;
}

// Contribution Types
export interface IContribution extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  month: string; // Format: "YYYY-MM"
  year: number;
  paidDate?: Date;
  paidStatus: 'paid' | 'pending' | 'overdue';
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money';
  notes?: string;
  recordedBy: Types.ObjectId; // Admin who recorded the payment
  createdAt: Date;
  updatedAt: Date;
}

// Loan Types
export interface ILoan extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  requestedAmount: number;
  approvedAmount?: number;
  interestRate: number; // Percentage (e.g., 16 for 16%)
  requestDate: Date;
  approvalDate?: Date;
  approvedBy?: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'completed';
  disbursementDate?: Date;
  expectedRepaymentDate: Date;
  actualRepaymentDate?: Date;
  totalAmountDue: number; // Principal + Interest
  amountPaid: number;
  remainingBalance: number;
  purpose?: string;
  collateral?: string;
  guarantor?: string;
  guarantorContact?: string;
  rejectionReason?: string;
  repayments: Types.ObjectId[];
  lastInterestPaidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Repayment Types
export interface IRepayment extends Document {
  _id: Types.ObjectId;
  loanId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money';
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  recordedBy: Types.ObjectId; // Admin who recorded the payment
  notes?: string;
  receiptNumber?: string;
  createdAt: Date;
}

// Dashboard Types
export interface IDashboardStats {
  totalSavings: number;
  totalLoansGiven: number;
  outstandingLoans: number;
  interestCollected: number;
  totalMembers: number;
  activeMembers: number;
  monthlyContributions: number;
  overduePayments: number;
  // Enhanced financial tracking
  totalCommunityValue: number; // contributions + loans + interest
  availableFunds: number; // contributions - active loan principals
  expectedYearlyInterest: number; // annual interest from active loans
  totalInterestEarned: number; // all-time interest collected
  activeLoansPrincipal: number; // principal amount of active loans
  loanToSavingsRatio: number; // loans / total savings ratio
}

export interface LoanSummary {
  borrowerName: string;
  borrowerMemberId: string;
  principalAmount: number;
  interestRate: number;
  yearlyInterestAmount: number;
  totalInterestEarned: number;
  remainingBalance: number;
  loanStartDate: Date;
  status: string;
}

export interface CommunityFinances {
  totalContributionsAllTime: number;
  totalActiveLoans: number;
  totalInterestCollected: number;
  availableLiquidFunds: number;
  expectedAnnualInterest: number;
  loanSummaries: LoanSummary[];
  monthlyFinancialHistory: {
    month: string;
    contributions: number;
    loansGiven: number;
    interestCollected: number;
    netGrowth: number;
  }[];
}

export interface IMemberStats {
  totalSavings: number;
  currentLoan?: ILoan;
  loanHistory: ILoan[];
  contributionHistory: IContribution[];
  savingsBalance: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter Types
export interface UserFilter extends PaginationQuery {
  role?: 'admin' | 'member';
  status?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ContributionFilter extends PaginationQuery {
  userId?: string;
  month?: string;
  year?: number;
  status?: 'paid' | 'pending' | 'overdue';
}

export interface LoanFilter extends PaginationQuery {
  userId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'completed';
  fromDate?: string;
  toDate?: string;
}
