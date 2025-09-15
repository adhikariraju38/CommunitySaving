import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import connectDB from '@/lib/mongodb';
import HistoricalInterest from '@/models/HistoricalInterest';
import { IHistoricalInterestEdit } from '@/types';

// GET /api/historical-interest/[id] - Get specific historical interest record
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

        // Extract ID from URL pathname
        const pathname = request.nextUrl.pathname;
        const id = pathname.split('/').pop();

        const record = await HistoricalInterest.findById(id)
            .populate('recordedBy', 'name')
            .populate('userId', 'name memberId')
            .lean();

        if (!record) {
            return NextResponse.json(
                { success: false, error: 'Historical interest record not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: record,
        });

    } catch (error) {
        console.error('Error fetching historical interest record:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

// PUT /api/historical-interest/[id] - Update historical interest record
const putHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can update historical interest
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Extract ID from URL pathname
        const pathname = request.nextUrl.pathname;
        const id = pathname.split('/').pop();
        const data: Partial<IHistoricalInterestEdit> = await request.json();

        // Find existing record
        const existingRecord = await HistoricalInterest.findById(id);
        if (!existingRecord) {
            return NextResponse.json(
                { success: false, error: 'Historical interest record not found' },
                { status: 404 }
            );
        }

        // Validation
        if (data.amount !== undefined && data.amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Valid interest amount is required' },
                { status: 400 }
            );
        }

        if (data.interestDate !== undefined) {
            const interestDate = new Date(data.interestDate);
            if (interestDate > new Date()) {
                return NextResponse.json(
                    { success: false, error: 'Interest date cannot be in the future' },
                    { status: 400 }
                );
            }
        }

        if (data.description !== undefined && !data.description.trim()) {
            return NextResponse.json(
                { success: false, error: 'Description cannot be empty' },
                { status: 400 }
            );
        }

        // Prepare update object
        const updateData: any = {};

        if (data.amount !== undefined) {
            updateData.amount = data.amount;
        }

        if (data.interestDate !== undefined) {
            updateData.interestDate = new Date(data.interestDate);
        }

        if (data.source !== undefined) {
            updateData.source = data.source;
        }

        if (data.description !== undefined) {
            updateData.description = data.description.trim();
        }

        if (data.userId !== undefined) {
            updateData.userId = data.userId || undefined;
        }

        if (data.borrowerName !== undefined) {
            updateData.borrowerName = data.borrowerName?.trim() || undefined;
        }

        if (data.notes !== undefined) {
            updateData.notes = data.notes?.trim() || undefined;
        }

        // Update record
        const updatedRecord = await HistoricalInterest.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('recordedBy', 'name')
            .populate('userId', 'name memberId');

        if (!updatedRecord) {
            return NextResponse.json(
                { success: false, error: 'Failed to update record' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedRecord,
            message: 'Historical interest record updated successfully',
        });

    } catch (error) {
        console.error('Error updating historical interest record:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

// DELETE /api/historical-interest/[id] - Delete historical interest record
const deleteHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        await connectDB();

        // Only admin can delete historical interest
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Extract ID from URL pathname
        const pathname = request.nextUrl.pathname;
        const id = pathname.split('/').pop();

        const deletedRecord = await HistoricalInterest.findByIdAndDelete(id);

        if (!deletedRecord) {
            return NextResponse.json(
                { success: false, error: 'Historical interest record not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Historical interest record deleted successfully',
        });

    } catch (error) {
        console.error('Error deleting historical interest record:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const GET = withErrorHandling(getHandler);
export const PUT = withErrorHandling(putHandler);
export const DELETE = withErrorHandling(deleteHandler);
