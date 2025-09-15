import { ILoan } from '@/types';

export interface DynamicLoanCalculation {
    totalAmountDue: number;
    remainingBalance: number;
    totalInterest: number;
    monthsElapsed: number;
}

/**
 * Calculate dynamic loan amounts based on current date
 */
export function calculateDynamicLoanAmounts(loan: ILoan, currentDate?: Date): DynamicLoanCalculation {
    const now = currentDate || new Date();

    // If no approval date or approved amount, return defaults
    if (!loan.approvalDate || !loan.approvedAmount) {
        return {
            totalAmountDue: loan.approvedAmount || loan.requestedAmount,
            remainingBalance: (loan.approvedAmount || loan.requestedAmount) - (loan.amountPaid || 0),
            totalInterest: 0,
            monthsElapsed: 0
        };
    }

    const principal = loan.approvedAmount;
    const approvalDate = new Date(loan.approvalDate);

    // Calculate months elapsed since approval
    const yearsDiff = now.getFullYear() - approvalDate.getFullYear();
    const monthsDiff = now.getMonth() - approvalDate.getMonth();
    const daysDiff = now.getDate() - approvalDate.getDate();

    // Total months elapsed (including partial months)
    let totalMonths = yearsDiff * 12 + monthsDiff;
    if (daysDiff > 0) {
        totalMonths += daysDiff / 30; // Add partial month
    }
    totalMonths = Math.max(0, totalMonths); // Ensure non-negative

    // Simple interest calculation based on actual time elapsed
    const totalInterest = principal * (loan.interestRate / 100) * (totalMonths / 12);
    const totalAmountDue = principal + totalInterest;
    const remainingBalance = totalAmountDue - (loan.amountPaid || 0);

    return {
        totalAmountDue,
        remainingBalance: Math.max(0, remainingBalance),
        totalInterest,
        monthsElapsed: totalMonths
    };
}

/**
 * Add dynamic calculations to a loan object
 */
export function addDynamicCalculationsToLoan(loan: any, currentDate?: Date): any {
    const calculations = calculateDynamicLoanAmounts(loan, currentDate);

    return {
        ...loan,
        totalAmountDue: calculations.totalAmountDue,
        remainingBalance: calculations.remainingBalance,
        totalInterest: calculations.totalInterest,
        monthsElapsed: calculations.monthsElapsed
    };
}

/**
 * Add dynamic calculations to multiple loans
 */
export function addDynamicCalculationsToLoans(loans: any[], currentDate?: Date): any[] {
    return loans.map(loan => addDynamicCalculationsToLoan(loan, currentDate));
}

/**
 * Calculate interest between two specific dates
 */
export function calculateInterestBetweenDates(
    principal: number,
    interestRate: number,
    fromDate: Date,
    toDate: Date
): { interestAmount: number; monthsElapsed: number; daysElapsed: number } {
    const timeDiff = toDate.getTime() - fromDate.getTime();
    const daysElapsed = Math.max(0, timeDiff / (1000 * 3600 * 24));
    const monthsElapsed = daysElapsed / 30.44; // Average days per month

    // Simple interest calculation
    const interestAmount = principal * (interestRate / 100) * (monthsElapsed / 12);

    return {
        interestAmount: Math.max(0, interestAmount),
        monthsElapsed,
        daysElapsed
    };
}

/**
 * Calculate interest from last payment date to settlement date
 */
export function calculateProratedInterest(
    loan: ILoan,
    settlementDate: Date,
    lastInterestPaymentDate?: Date
): {
    interestAmount: number;
    fromDate: Date;
    toDate: Date;
    monthsElapsed: number;
    daysElapsed: number;
} {
    const principal = loan.approvedAmount || loan.requestedAmount;
    const approvalDate = new Date(loan.approvalDate || loan.requestDate);

    // Determine the starting date for interest calculation
    let fromDate = approvalDate;

    if (lastInterestPaymentDate) {
        fromDate = new Date(lastInterestPaymentDate);
    } else if (loan.lastInterestPaidDate) {
        fromDate = new Date(loan.lastInterestPaidDate);
    }

    // Calculate interest from the start date to settlement date
    const calculation = calculateInterestBetweenDates(
        principal,
        loan.interestRate,
        fromDate,
        settlementDate
    );

    return {
        ...calculation,
        fromDate,
        toDate: settlementDate
    };
}
