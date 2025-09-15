import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, AuthenticatedRequest } from '@/middleware/auth';
import { COMMUNITY_CONFIG } from '@/config/community';

interface PaymentBreakdown {
    yearNumber: number;
    startMonth: number;
    endMonth: number;
    monthsCount: number;
    baseContribution: number;
    interestPeriodMonths: number;
    interestAmount: number;
    totalForYear: number;
}

interface CalculationResult {
    joiningDate: string;
    monthsMissed: number;
    yearBreakdown: PaymentBreakdown[];
    totalBaseContribution: number;
    totalInterest: number;
    grandTotal: number;
    monthlyPaymentOption: number;
}

// GET /api/calculate-new-member-payment - Calculate payment for new member
const getHandler = withAuth(async (request: AuthenticatedRequest) => {
    try {
        // Only admin can access this calculator
        if (request.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const joiningDateParam = searchParams.get('joiningDate');

        if (!joiningDateParam) {
            return NextResponse.json(
                { success: false, error: 'Joining date is required' },
                { status: 400 }
            );
        }

        const joiningDate = new Date(joiningDateParam);
        const communityStartDate = new Date(COMMUNITY_CONFIG.OPENING_DATE);
        const monthlyContribution = COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT;
        const annualInterestRate = COMMUNITY_CONFIG.ANNUAL_INTEREST_RATE / 100; // Convert to decimal

        // Validate joining date
        if (joiningDate <= communityStartDate) {
            return NextResponse.json(
                { success: false, error: 'Joining date must be after community start date' },
                { status: 400 }
            );
        }

        // Calculate months missed - using end-of-month policy (exclude current month)
        const currentDate = new Date();
        const lastCompletedMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        
        // Calculate from community start to last completed month
        const monthsDiff = (lastCompletedMonth.getFullYear() - communityStartDate.getFullYear()) * 12 +
            (lastCompletedMonth.getMonth() - communityStartDate.getMonth()) + 1;

        if (monthsDiff <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid joining date' },
                { status: 400 }
            );
        }

        // Calculate total years
        const totalYears = Math.ceil(monthsDiff / 12);

        // Calculate year-by-year breakdown
        const yearBreakdown: PaymentBreakdown[] = [];
        let totalBaseContribution = 0;
        let totalInterest = 0;
        let currentMonth = 1;

        while (currentMonth <= monthsDiff) {
            const yearNumber = Math.ceil(currentMonth / 12);
            const startMonth = currentMonth;
            const endMonth = Math.min(currentMonth + 11, monthsDiff);
            const monthsInThisYear = endMonth - startMonth + 1;

            // Base contribution for this year
            const baseContribution = monthsInThisYear * monthlyContribution;

            // Interest period: Year 1 gets interest for (totalYears), Year 2 gets (totalYears-1), etc.
            // For partial years, calculate proportionally
            const interestYears = totalYears - yearNumber + 1;
            const interestPeriodMonths = interestYears * 12;

            // Calculate interest for this year's money
            const interestAmount = baseContribution * annualInterestRate * (interestPeriodMonths / 12);

            const yearData: PaymentBreakdown = {
                yearNumber,
                startMonth,
                endMonth,
                monthsCount: monthsInThisYear,
                baseContribution,
                interestPeriodMonths,
                interestAmount: Math.round(interestAmount * 100) / 100, // Round to 2 decimal places
                totalForYear: baseContribution + interestAmount
            };

            yearBreakdown.push(yearData);
            totalBaseContribution += baseContribution;
            totalInterest += interestAmount;

            currentMonth = endMonth + 1;
        }

        const grandTotal = totalBaseContribution + totalInterest;
        const monthlyPaymentOption = Math.round((grandTotal / 24) * 100) / 100; // Spread over 24 months

        const result: CalculationResult = {
            joiningDate: joiningDate.toISOString().split('T')[0],
            monthsMissed: monthsDiff,
            yearBreakdown,
            totalBaseContribution,
            totalInterest: Math.round(totalInterest * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100,
            monthlyPaymentOption
        };

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('Error calculating new member payment:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const GET = withErrorHandling(getHandler);
