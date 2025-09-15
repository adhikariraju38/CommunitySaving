"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Calculator,
    Calendar,
    DollarSign,
    TrendingUp,
    Info,
    Clock
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { apiRequest } from "@/lib/utils";
import { COMMUNITY_CONFIG } from "@/config/community";

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

export default function NewMemberCalculator() {
    const [joiningDate, setJoiningDate] = useState('');
    const [calculation, setCalculation] = useState<CalculationResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        if (!joiningDate) {
            showToast.error('Please select a joining date');
            return;
        }

        setLoading(true);
        try {
            const result = await apiRequest<CalculationResult>(
                `/api/calculate-new-member-payment?joiningDate=${joiningDate}`
            );

            if (result.success && result.data) {
                setCalculation(result.data);
                showToast.success('Payment calculation completed');
            } else {
                showToast.error(result.error || 'Failed to calculate payment');
            }
        } catch (error) {
            console.error('Error calculating payment:', error);
            showToast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const communityStartDate = COMMUNITY_CONFIG.OPENING_DATE.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">New Member Payment Calculator</h1>
                    <p className="text-muted-foreground">
                        Calculate fair joining payment based on community interest policy
                    </p>
                </div>
                <Calculator className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Community Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Community Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Community Start Date</span>
                            <span className="font-medium">{communityStartDate}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Monthly Contribution</span>
                            <span className="font-medium">{formatCurrency(COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Interest Rate</span>
                            <span className="font-medium">{COMMUNITY_CONFIG.ANNUAL_INTEREST_RATE}% annually</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Calculator Input */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Calculate Payment
                    </CardTitle>
                    <CardDescription>
                        Enter the date when the new member wants to join the community
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <Label htmlFor="joiningDate">New Member Joining Date</Label>
                            <Input
                                id="joiningDate"
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                min={COMMUNITY_CONFIG.OPENING_DATE.toISOString().split('T')[0]}
                            />
                        </div>
                        <Button
                            onClick={handleCalculate}
                            disabled={loading || !joiningDate}
                            className="px-8"
                        >
                            {loading ? 'Calculating...' : 'Calculate'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {calculation && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Months Missed</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{calculation.monthsMissed}</div>
                                <p className="text-xs text-muted-foreground">
                                    From {communityStartDate}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Base Contributions</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(calculation.totalBaseContribution)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {calculation.monthsMissed} × {formatCurrency(COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Interest Amount</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(calculation.totalInterest)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Based on {COMMUNITY_CONFIG.ANNUAL_INTEREST_RATE}% annual rate
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Payment</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(calculation.grandTotal)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    One-time joining payment
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Payment Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Options</CardTitle>
                            <CardDescription>
                                Different ways the new member can pay the joining amount
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Option 1: Lump Sum Payment</h3>
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatCurrency(calculation.grandTotal)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Pay the full amount when joining
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Option 2: Monthly Payments</h3>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(calculation.monthlyPaymentOption)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Pay over 24 months (plus regular monthly contributions)
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Year-by-Year Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Year-by-Year Breakdown</CardTitle>
                            <CardDescription>
                                Detailed calculation showing how interest is calculated for each year
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Months</TableHead>
                                            <TableHead>Base Amount</TableHead>
                                            <TableHead>Interest Period</TableHead>
                                            <TableHead>Interest Amount</TableHead>
                                            <TableHead>Year Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {calculation.yearBreakdown.map((year) => (
                                            <TableRow key={year.yearNumber}>
                                                <TableCell>
                                                    <Badge variant="outline">Year {year.yearNumber}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{year.monthsCount} months</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Months {year.startMonth}-{year.endMonth}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCurrency(year.baseContribution)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div>{year.interestPeriodMonths} months</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {((year.interestPeriodMonths / 12) * 100).toFixed(1)}% of year
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-orange-600 font-medium">
                                                    {formatCurrency(year.interestAmount)}
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    {formatCurrency(year.totalForYear)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Policy Explanation */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Policy Explanation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <p className="text-sm">
                                    <strong>Why this calculation?</strong> New members must pay the equivalent value
                                    that existing members' contributions have earned through interest over time.
                                </p>
                                <div className="space-y-2">
                                    <p className="text-sm">
                                        <strong>Interest Logic:</strong>
                                    </p>
                                    <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                                        <li>Year 1 money has been earning interest for the longest time</li>
                                        <li>Year 2 money has been earning interest for a shorter period</li>
                                        <li>Recent months' money has earned little or no interest</li>
                                        <li>This ensures fairness between existing and new members</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
