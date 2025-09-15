import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import HistoricalInterest from '@/models/HistoricalInterest';

// GET /api/historical-interest/summary - Get summary statistics for historical interest
const getHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can view historical interest summary
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');

        // Get total historical interest
        const totalHistoricalInterest = await HistoricalInterest.getTotalHistoricalInterest();

        // Get yearly breakdown if year is specified
        let yearlyData = null;
        if (year) {
            yearlyData = await HistoricalInterest.getHistoricalInterestByYear(parseInt(year));
        }

        // Get summary by source
        const summaryBySource = await HistoricalInterest.aggregate([
            {
                $group: {
                    _id: '$source',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { totalAmount: -1 },
            },
        ]);

        // Get recent records (last 10)
        const recentRecords = await HistoricalInterest.find()
            .populate('recordedBy', 'name')
            .populate('userId', 'name memberId')
            .sort({ interestDate: -1, createdAt: -1 })
            .limit(10)
            .lean();

        // Get yearly totals for chart
        const yearlyTotals = await HistoricalInterest.aggregate([
            {
                $group: {
                    _id: { year: { $year: '$interestDate' } },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.year': 1 },
            },
        ]);

        return NextResponse.json({
            success: true,
            data: {
                totalHistoricalInterest,
                yearlyData,
                summaryBySource,
                recentRecords,
                yearlyTotals: yearlyTotals.map(y => ({
                    year: y._id.year,
                    totalAmount: y.totalAmount,
                    count: y.count,
                })),
            },
        });

    } catch (error) {
        console.error('Error fetching historical interest summary:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const GET = withErrorHandling(getHandler);
