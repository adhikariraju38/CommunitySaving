import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Loan from '@/models/Loan';
import { withAdmin, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';

// POST /api/admin/recalculate-loan-interest - Recalculate interest for all existing loans (Admin only)
export const POST = withErrorHandling(
    withAdmin(async (request: AuthenticatedRequest) => {
        await connectToDatabase();

        try {
            // Find all loans that have approval dates and approved amounts
            const loans = await Loan.find({
                approvalDate: { $exists: true },
                approvedAmount: { $exists: true, $gt: 0 },
                status: { $in: ['approved', 'disbursed'] }
            });

            let updatedCount = 0;
            const results: any[] = [];

            for (const loan of loans) {
                const oldTotalDue = loan.totalAmountDue;
                const oldInterest = oldTotalDue - loan.approvedAmount;

                // Calculate new interest based on current date and approval date
                const principal = loan.approvedAmount;
                const approvalDate = new Date(loan.approvalDate);
                const currentDate = new Date();

                // Calculate months elapsed since approval
                const yearsDiff = currentDate.getFullYear() - approvalDate.getFullYear();
                const monthsDiff = currentDate.getMonth() - approvalDate.getMonth();
                const daysDiff = currentDate.getDate() - approvalDate.getDate();

                // Total months elapsed (including partial months)
                let totalMonths = yearsDiff * 12 + monthsDiff;
                if (daysDiff > 0) {
                    totalMonths += daysDiff / 30; // Add partial month
                }
                totalMonths = Math.max(0, totalMonths); // Ensure non-negative

                // Simple interest calculation based on actual time elapsed
                const newInterest = principal * (loan.interestRate / 100) * (totalMonths / 12);
                const newTotalDue = principal + newInterest;
                const newRemainingBalance = newTotalDue - loan.amountPaid;

                // Update the loan
                loan.totalAmountDue = newTotalDue;
                loan.remainingBalance = newRemainingBalance;

                await loan.save();
                updatedCount++;

                results.push({
                    loanId: loan._id,
                    borrower: loan.userId,
                    principal: principal,
                    approvalDate: approvalDate,
                    monthsElapsed: totalMonths.toFixed(2),
                    oldInterest: oldInterest.toFixed(2),
                    newInterest: newInterest.toFixed(2),
                    oldTotalDue: oldTotalDue.toFixed(2),
                    newTotalDue: newTotalDue.toFixed(2),
                    difference: (newTotalDue - oldTotalDue).toFixed(2)
                });
            }

            return NextResponse.json({
                success: true,
                message: `Successfully recalculated interest for ${updatedCount} loans`,
                data: {
                    updatedCount,
                    results
                }
            });

        } catch (error) {
            console.error('Error recalculating loan interest:', error);
            return NextResponse.json(
                {
                    success: false,
                    message: 'Failed to recalculate loan interest',
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            );
        }
    })
);
