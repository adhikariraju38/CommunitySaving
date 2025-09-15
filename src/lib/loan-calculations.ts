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
