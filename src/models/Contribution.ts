import mongoose, { Schema, Model } from 'mongoose';
import { IContribution } from '@/types';

// Define interface for static methods
interface IContributionModel extends Model<IContribution> {
  createMonthlyContributions(year: number, month: number): Promise<IContribution[]>;
  getUserTotalSavings(userId: string): Promise<{ totalSavings: number; contributionCount: number }>;
  getMonthlyStats(year: number, month: number): Promise<any>;
}

const ContributionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
      default: 2000, // Default monthly contribution
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-\d{2}$/, 'Month must be in format YYYY-MM'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2020, 'Year must be 2020 or later'],
      max: [2100, 'Year must be reasonable'],
    },
    paidDate: {
      type: Date,
    },
    paidStatus: {
      type: String,
      enum: ['paid', 'pending', 'overdue'],
      default: 'pending',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'mobile_money'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function(this: IContribution) {
        return this.paidStatus === 'paid';
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one contribution per user per month
ContributionSchema.index({ userId: 1, month: 1 }, { unique: true });

// Index for queries
ContributionSchema.index({ month: 1, paidStatus: 1 });
ContributionSchema.index({ year: 1, paidStatus: 1 });
ContributionSchema.index({ paidStatus: 1, paidDate: 1 });

// Pre-save middleware to set year from month
ContributionSchema.pre('save', function (this: IContribution, next) {
  if (this.month) {
    this.year = parseInt(this.month.split('-')[0]);
  }
  
  // Set paidDate if status is being changed to paid and no paidDate exists
  if (this.paidStatus === 'paid' && !this.paidDate) {
    this.paidDate = new Date();
  }
  
  next();
});

// Static methods
ContributionSchema.statics.createMonthlyContributions = async function (year: number, month: number) {
  const User = mongoose.model('User');
  const activeUsers = await User.find({ isActive: true, role: 'member' });
  
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const contributions = [];
  
  for (const user of activeUsers) {
    // Check if contribution already exists
    const existing = await this.findOne({
      userId: user._id,
      month: monthStr,
    });
    
    if (!existing) {
      contributions.push({
        userId: user._id,
        amount: 2000,
        month: monthStr,
        year,
        paidStatus: 'pending',
      });
    }
  }
  
  if (contributions.length > 0) {
    return this.insertMany(contributions);
  }
  
  return [];
};

ContributionSchema.statics.getUserTotalSavings = async function (userId: string) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        paidStatus: 'paid',
      },
    },
    {
      $group: {
        _id: null,
        totalSavings: { $sum: '$amount' },
        contributionCount: { $sum: 1 },
      },
    },
  ]);
  
  return result.length > 0 ? result[0] : { totalSavings: 0, contributionCount: 0 };
};

ContributionSchema.statics.getMonthlyStats = async function (year: number, month: number) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  const stats = await this.aggregate([
    { $match: { month: monthStr } },
    {
      $group: {
        _id: '$paidStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);
  
  const result = {
    paid: { count: 0, totalAmount: 0 },
    pending: { count: 0, totalAmount: 0 },
    overdue: { count: 0, totalAmount: 0 },
  };
  
  stats.forEach((stat) => {
    if (result[stat._id as keyof typeof result]) {
      result[stat._id as keyof typeof result] = {
        count: stat.count,
        totalAmount: stat.totalAmount,
      };
    }
  });
  
  return result;
};

const Contribution = (mongoose.models.Contribution || mongoose.model<IContribution, IContributionModel>('Contribution', ContributionSchema)) as IContributionModel;

export default Contribution;
