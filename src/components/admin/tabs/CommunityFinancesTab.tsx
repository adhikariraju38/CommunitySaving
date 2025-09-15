"use client";

import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCommunityFinances } from "@/hooks/useAdminData";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  Calendar,
  RefreshCw,
} from "lucide-react";

export default function CommunityFinancesTab() {
  const { communityFinances, loading, error, loadCommunityFinances } =
    useCommunityFinances();

  // Load data when component mounts
  useEffect(() => {
    loadCommunityFinances();
  }, [loadCommunityFinances]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-600 mb-2">{error}</p>
        <Button onClick={loadCommunityFinances}>Retry</Button>
      </div>
    );
  }

  if (!communityFinances) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No financial data available</p>
        <Button onClick={loadCommunityFinances} className="mt-2">
          Load Data
        </Button>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    color = "blue",
  }: {
    title: string;
    value: string;
    description: string;
    icon: any;
    color?: "blue" | "green" | "yellow" | "red";
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Icon
            className={`h-8 w-8 ${
              color === "green"
                ? "text-green-600"
                : color === "yellow"
                ? "text-yellow-600"
                : color === "red"
                ? "text-red-600"
                : "text-blue-600"
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Community Finances</h2>
          <p className="text-muted-foreground">
            Detailed financial overview and loan portfolio
          </p>
        </div>
        <Button
          onClick={loadCommunityFinances}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contributions"
          value={formatCurrency(communityFinances.totalContributionsAllTime)}
          description="All-time member savings"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Active Loans"
          value={formatCurrency(communityFinances.totalActiveLoans)}
          description="Currently outstanding"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Interest Collected"
          value={formatCurrency(communityFinances.totalInterestCollected)}
          description="Total earnings"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Available Funds"
          value={formatCurrency(communityFinances.availableLiquidFunds)}
          description="Ready for lending"
          icon={CheckCircle}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Loan Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Active Loan Portfolio
            </CardTitle>
            <CardDescription>
              Current active loans with expected returns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Expected Annual Interest</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(communityFinances.expectedAnnualInterest)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Borrower</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Annual Interest</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communityFinances.loanSummaries.length > 0 ? (
                      communityFinances.loanSummaries.map((loan, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{loan.borrowerName}</div>
                              <div className="text-xs text-muted-foreground">
                                {loan.borrowerMemberId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(loan.principalAmount)}
                          </TableCell>
                          <TableCell>{loan.interestRate}%</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(loan.yearlyInterestAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800">
                              {loan.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <div className="text-muted-foreground">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p>No active loans</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Financial History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Financial History
            </CardTitle>
            <CardDescription>Last 12 months financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Contributions</TableHead>
                    <TableHead>Loans</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Net Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communityFinances.monthlyFinancialHistory.length > 0 ? (
                    communityFinances.monthlyFinancialHistory.map(
                      (month, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {month.month}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(month.contributions)}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {formatCurrency(month.loansGiven)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(month.interestCollected)}
                          </TableCell>
                          <TableCell
                            className={
                              month.netGrowth >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(month.netGrowth)}
                          </TableCell>
                        </TableRow>
                      )
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <div className="text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No historical data available</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Community Financial Health</CardTitle>
          <CardDescription>
            Overall assessment of community savings performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Liquidity Status</h4>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    communityFinances.availableLiquidFunds > 50000
                      ? "bg-green-500"
                      : communityFinances.availableLiquidFunds > 20000
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm">
                  {communityFinances.availableLiquidFunds > 50000
                    ? "Excellent"
                    : communityFinances.availableLiquidFunds > 20000
                    ? "Good"
                    : "Needs Attention"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(communityFinances.availableLiquidFunds)}{" "}
                available for new loans
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Interest Performance</h4>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm">
                  {formatCurrency(communityFinances.expectedAnnualInterest)}
                  /year expected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(communityFinances.totalInterestCollected)}{" "}
                collected to date
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Growth Trajectory</h4>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">Stable Growth</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total community value:{" "}
                {formatCurrency(
                  communityFinances.totalContributionsAllTime +
                    communityFinances.totalActiveLoans +
                    communityFinances.totalInterestCollected
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
