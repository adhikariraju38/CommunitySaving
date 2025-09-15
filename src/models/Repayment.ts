import mongoose, { Schema } from 'mongoose';
import { IRepayment } from '@/types';

const RepaymentSchema: Schema = new Schema(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: [true, 'Loan ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Repayment amount is required'],
      min: [0, 'Repayment amount must be positive'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'mobile_money', 'settlement'],
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [0, 'Principal amount must be positive'],
    },
    interestAmount: {
      type: Number,
      required: [true, 'Interest amount is required'],
      min: [0, 'Interest amount must be positive'],
    },
    remainingBalance: {
      type: Number,
      required: [true, 'Remaining balance is required'],
      min: [0, 'Remaining balance must be positive'],
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by is required'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
RepaymentSchema.index({ loanId: 1, paymentDate: -1 });
RepaymentSchema.index({ userId: 1, paymentDate: -1 });
RepaymentSchema.index({ paymentDate: -1 });

// Pre-save middleware to generate receipt number
RepaymentSchema.pre('save', async function (this: IRepayment, next) {
  if (!this.receiptNumber && this.isNew) {
    const RepaymentModel = this.constructor as mongoose.Model<IRepayment>;
    const count = await RepaymentModel.countDocuments();
    this.receiptNumber = `RPT${Date.now()}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

const Repayment = mongoose.models.Repayment || mongoose.model<IRepayment>('Repayment', RepaymentSchema);

export default Repayment;
