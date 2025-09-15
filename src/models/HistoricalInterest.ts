import mongoose, { Schema, Model } from 'mongoose';
import { Document, Types } from 'mongoose';

// Historical Interest interface
export interface IHistoricalInterest extends Document {
    _id: Types.ObjectId;
    amount: number;
    interestDate: Date;
    source: 'loan_repayment' | 'penalty' | 'late_fee' | 'settlement' | 'other';
    description: string;
    userId?: Types.ObjectId; // User who paid the interest
    loanId?: Types.ObjectId; // Optional - if related to a specific loan
    borrowerName?: string; // For easier tracking without complex joins (legacy support)
    recordedBy: Types.ObjectId;
    receiptNumber?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define interface for static methods
interface IHistoricalInterestModel extends Model<IHistoricalInterest> {
    getTotalHistoricalInterest(): Promise<number>;
    getHistoricalInterestByDateRange(startDate: Date, endDate: Date): Promise<IHistoricalInterest[]>;
    getHistoricalInterestByYear(year: number): Promise<{ totalAmount: number; monthlyBreakdown: any[] }>;
}

const HistoricalInterestSchema: Schema = new Schema(
    {
        amount: {
            type: Number,
            required: [true, 'Interest amount is required'],
            min: [0, 'Interest amount must be positive'],
        },
        interestDate: {
            type: Date,
            required: [true, 'Interest date is required'],
            validate: {
                validator: function (value: Date) {
                    // Don't allow future dates
                    return value <= new Date();
                },
                message: 'Interest date cannot be in the future',
            },
        },
        source: {
            type: String,
            enum: ['loan_repayment', 'penalty', 'late_fee', 'settlement', 'other'],
            required: [true, 'Interest source is required'],
            default: 'other',
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            maxlength: [200, 'Description cannot exceed 200 characters'],
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        loanId: {
            type: Schema.Types.ObjectId,
            ref: 'Loan',
            required: false,
        },
        borrowerName: {
            type: String,
            trim: true,
            maxlength: [100, 'Borrower name cannot exceed 100 characters'],
        },
        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recorded by is required'],
        },
        receiptNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
HistoricalInterestSchema.index({ interestDate: -1 });
HistoricalInterestSchema.index({ source: 1, interestDate: -1 });
HistoricalInterestSchema.index({ userId: 1, interestDate: -1 });
HistoricalInterestSchema.index({ loanId: 1, interestDate: -1 });
HistoricalInterestSchema.index({ recordedBy: 1, interestDate: -1 });

// Pre-save middleware to generate receipt number
HistoricalInterestSchema.pre('save', async function (this: IHistoricalInterest, next) {
    if (!this.receiptNumber && this.isNew) {
        const HistoricalInterestModel = this.constructor as mongoose.Model<IHistoricalInterest>;
        const count = await HistoricalInterestModel.countDocuments();
        this.receiptNumber = `HI${Date.now()}${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

// Static method to get total historical interest
HistoricalInterestSchema.statics.getTotalHistoricalInterest = async function () {
    const result = await this.aggregate([
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
            },
        },
    ]);

    return result.length > 0 ? result[0].totalAmount : 0;
};

// Static method to get historical interest by date range
HistoricalInterestSchema.statics.getHistoricalInterestByDateRange = async function (
    startDate: Date,
    endDate: Date
) {
    return this.find({
        interestDate: {
            $gte: startDate,
            $lte: endDate,
        },
    })
        .populate('recordedBy', 'name')
        .sort({ interestDate: -1 });
};

// Static method to get historical interest by year with monthly breakdown
HistoricalInterestSchema.statics.getHistoricalInterestByYear = async function (year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const result = await this.aggregate([
        {
            $match: {
                interestDate: {
                    $gte: startDate,
                    $lte: endDate,
                },
            },
        },
        {
            $group: {
                _id: {
                    month: { $month: '$interestDate' },
                    year: { $year: '$interestDate' },
                },
                monthlyAmount: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
        {
            $sort: { '_id.month': 1 },
        },
    ]);

    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
        const monthData = result.find(r => r._id.month === i + 1);
        return {
            month: i + 1,
            monthName: new Date(year, i).toLocaleString('default', { month: 'long' }),
            amount: monthData ? monthData.monthlyAmount : 0,
            count: monthData ? monthData.count : 0,
        };
    });

    const totalAmount = result.reduce((sum, r) => sum + r.monthlyAmount, 0);

    return {
        totalAmount,
        monthlyBreakdown,
    };
};

const HistoricalInterest = (mongoose.models.HistoricalInterest ||
    mongoose.model<IHistoricalInterest, IHistoricalInterestModel>('HistoricalInterest', HistoricalInterestSchema)) as IHistoricalInterestModel;

export default HistoricalInterest;
