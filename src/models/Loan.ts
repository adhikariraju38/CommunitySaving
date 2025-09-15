import mongoose, { Schema, Model } from 'mongoose';
import { ILoan } from '@/types';

// Define interface for static methods
interface ILoanModel extends Model<ILoan> {
  getTotalLoansGiven(): Promise<{ totalAmount: number; loanCount: number }>;
  getOutstandingLoans(): Promise<{ totalOutstanding: number; loanCount: number }>;
  getInterestCollected(): Promise<number>;
  getUserCurrentLoan(userId: string): Promise<ILoan | null>;
  getUserLoanHistory(userId: string): Promise<ILoan[]>;
}

const LoanSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    requestedAmount: {
      type: Number,
      required: [true, 'Requested amount is required'],
      min: [1000, 'Minimum loan amount is 1000'],
      max: [100000, 'Maximum loan amount is 100000'],
    },
    approvedAmount: {
      type: Number,
      min: [0, 'Approved amount must be positive'],
      validate: {
        validator: function(this: ILoan, value: number) {
          return !value || value <= this.requestedAmount;
        },
        message: 'Approved amount cannot exceed requested amount',
      },
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      default: 16, // 16% annual interest rate
      min: [0, 'Interest rate must be positive'],
      max: [100, 'Interest rate cannot exceed 100%'],
    },
    requestDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    approvalDate: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function(this: ILoan) {
        return this.status === 'approved' || this.status === 'disbursed';
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed', 'completed'],
      default: 'pending',
      required: true,
    },
    disbursementDate: {
      type: Date,
    },
    expectedRepaymentDate: {
      type: Date,
      required: [true, 'Expected repayment date is required'],
    },
    actualRepaymentDate: {
      type: Date,
    },
    totalAmountDue: {
      type: Number,
      required: [true, 'Total amount due is required'],
      min: [0, 'Total amount due must be positive'],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid must be positive'],
    },
    remainingBalance: {
      type: Number,
      required: [true, 'Remaining balance is required'],
      min: [0, 'Remaining balance must be positive'],
    },
    purpose: {
      type: String,
      required: [true, 'Loan purpose is required'],
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    collateral: {
      type: String,
      maxlength: [500, 'Collateral description cannot exceed 500 characters'],
    },
    guarantor: {
      type: String,
      maxlength: [100, 'Guarantor name cannot exceed 100 characters'],
    },
    guarantorContact: {
      type: String,
      maxlength: [50, 'Guarantor contact cannot exceed 50 characters'],
    },
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    repayments: [{
      type: Schema.Types.ObjectId,
      ref: 'Repayment',
    }],
    lastInterestPaidDate: {
      type: Date,
      description: 'Date when interest was last paid for yearly settlement',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
LoanSchema.index({ userId: 1, status: 1 });
LoanSchema.index({ status: 1, requestDate: -1 });
LoanSchema.index({ approvedBy: 1, approvalDate: -1 });
LoanSchema.index({ expectedRepaymentDate: 1, status: 1 });

// Pre-save middleware to calculate total amount due and remaining balance
LoanSchema.pre('save', function (this: ILoan, next) {
  // Calculate total amount due when loan is approved or disbursed
  if (this.isModified('approvedAmount') || this.isModified('interestRate')) {
    if (this.approvedAmount) {
      const principal = this.approvedAmount;
      
      // Calculate repayment period in months (default 12 months for simplicity)
      const requestDate = new Date(this.requestDate);
      const expectedDate = new Date(this.expectedRepaymentDate);
      const monthsDiff = Math.max(1, Math.round((expectedDate.getTime() - requestDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      
      // Simple interest calculation
      const totalInterest = principal * (this.interestRate / 100) * (monthsDiff / 12);
      this.totalAmountDue = principal + totalInterest;
      this.remainingBalance = this.totalAmountDue - this.amountPaid;
    }
  }
  
  // Update remaining balance when amount paid changes
  if (this.isModified('amountPaid')) {
    this.remainingBalance = this.totalAmountDue - this.amountPaid;
    
    // Mark as completed if fully paid
    if (this.remainingBalance <= 0 && this.status === 'disbursed') {
      this.status = 'completed';
      this.actualRepaymentDate = new Date();
    }
  }
  
  // Set approval date when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.approvalDate) {
    this.approvalDate = new Date();
  }
  
  // Set disbursement date when status changes to disbursed
  if (this.isModified('status') && this.status === 'disbursed' && !this.disbursementDate) {
    this.disbursementDate = new Date();
  }
  
  next();
});

// Static methods
LoanSchema.statics.getTotalLoansGiven = async function () {
  const result = await this.aggregate([
    {
      $match: {
        status: { $in: ['disbursed', 'completed'] },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$approvedAmount' },
        loanCount: { $sum: 1 },
      },
    },
  ]);
  
  return result.length > 0 ? result[0] : { totalAmount: 0, loanCount: 0 };
};

LoanSchema.statics.getOutstandingLoans = async function () {
  const result = await this.aggregate([
    {
      $match: {
        status: 'disbursed',
        remainingBalance: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        totalOutstanding: { $sum: '$remainingBalance' },
        loanCount: { $sum: 1 },
      },
    },
  ]);
  
  return result.length > 0 ? result[0] : { totalOutstanding: 0, loanCount: 0 };
};

LoanSchema.statics.getInterestCollected = async function () {
  // Dynamic import to avoid circular dependencies
  const { default: Repayment } = await import('./Repayment');
  const result = await Repayment.aggregate([
    {
      $group: {
        _id: null,
        totalInterest: { $sum: '$interestAmount' },
      },
    },
  ]);
  
  return result.length > 0 ? result[0].totalInterest : 0;
};

LoanSchema.statics.getUserCurrentLoan = async function (userId: string) {
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['approved', 'disbursed'] },
  }).populate('repayments');
};

LoanSchema.statics.getUserLoanHistory = async function (userId: string) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .populate('repayments')
    .sort({ requestDate: -1 });
};

const Loan = (mongoose.models.Loan || mongoose.model<ILoan, ILoanModel>('Loan', LoanSchema)) as ILoanModel;

export default Loan;
