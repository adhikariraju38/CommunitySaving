import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import HistoricalInterest from '@/models/HistoricalInterest';
import { IHistoricalInterestCreate } from '@/types';

// GET /api/historical-interest - Get historical interest records with optional filtering
const getHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can view historical interest
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        const source = searchParams.get('source');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build filter query
        const filter: any = {};

        // Date filtering
        if (year && month) {
            const targetYear = parseInt(year);
            const targetMonth = parseInt(month);
            filter.interestDate = {
                $gte: new Date(targetYear, targetMonth - 1, 1),
                $lt: new Date(targetYear, targetMonth, 1),
            };
        } else if (year) {
            const targetYear = parseInt(year);
            filter.interestDate = {
                $gte: new Date(targetYear, 0, 1),
                $lt: new Date(targetYear + 1, 0, 1),
            };
        } else if (startDate && endDate) {
            filter.interestDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Source filtering
        if (source) {
            filter.source = source;
        }

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalCount = await HistoricalInterest.countDocuments(filter);

        // Get records with pagination
        const records = await HistoricalInterest.find(filter)
            .populate('recordedBy', 'name')
            .populate('userId', 'name memberId')
            .sort({ interestDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate summary statistics
        const summaryResult = await HistoricalInterest.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    recordCount: { $sum: 1 },
                    avgAmount: { $avg: '$amount' },
                },
            },
        ]);

        const summary = summaryResult.length > 0 ? summaryResult[0] : {
            totalAmount: 0,
            recordCount: 0,
            avgAmount: 0,
        };

        return NextResponse.json({
            success: true,
            data: {
                records,
                pagination: {
                    current: page,
                    total: Math.ceil(totalCount / limit),
                    count: totalCount,
                    limit,
                    hasNext: skip + limit < totalCount,
                    hasPrev: page > 1,
                },
                summary: {
                    totalAmount: summary.totalAmount || 0,
                    recordCount: summary.recordCount || 0,
                    avgAmount: summary.avgAmount || 0,
                },
            },
        });

    } catch (error) {
        console.error('Error fetching historical interest:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

// POST /api/historical-interest - Create new historical interest record
const postHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can create historical interest
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const data: IHistoricalInterestCreate = await request.json();

        // Validation
        if (!data.amount || data.amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Valid interest amount is required' },
                { status: 400 }
            );
        }

        if (!data.interestDate) {
            return NextResponse.json(
                { success: false, error: 'Interest date is required' },
                { status: 400 }
            );
        }

        if (!data.description || !data.description.trim()) {
            return NextResponse.json(
                { success: false, error: 'Description is required' },
                { status: 400 }
            );
        }

        if (!data.source) {
            return NextResponse.json(
                { success: false, error: 'Interest source is required' },
                { status: 400 }
            );
        }

        // Validate interest date is not in the future
        const interestDate = new Date(data.interestDate);
        if (interestDate > new Date()) {
            return NextResponse.json(
                { success: false, error: 'Interest date cannot be in the future' },
                { status: 400 }
            );
        }

        // Create new historical interest record
        const newRecord = await HistoricalInterest.create({
            amount: data.amount,
            interestDate: interestDate,
            source: data.source,
            description: data.description.trim(),
            userId: data.userId || undefined,
            borrowerName: data.borrowerName?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
            recordedBy: request.user.userId,
        });

        // Populate recordedBy and userId for response
        await newRecord.populate('recordedBy', 'name');
        await newRecord.populate('userId', 'name memberId');

        return NextResponse.json({
            success: true,
            data: newRecord,
            message: 'Historical interest record created successfully',
        });

    } catch (error) {
        console.error('Error creating historical interest:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
