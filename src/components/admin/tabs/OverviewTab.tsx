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
import { useDashboardOverview } from "@/hooks/useAdminData";
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  RefreshCw,
} from "lucide-react";

export default function OverviewTab() {
  const {
    dashboardStats,
    recentLoans,
    recentUsers,
    pendingContributions,
    loading,
    error,
    loadOverviewData,
  } = useDashboardOverview();

  // Load data when component mounts
  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

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
        <Button onClick={loadOverviewData}>Retry</Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    trend?: "up" | "down" | "neutral";
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <span
                  className={`text-sm ${
                    trend === "up"
                      ? "text-green-600"
                      : trend === "down"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-fade-in">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Community savings and loan statistics
          </p>
        </div>
        <Button
          onClick={loadOverviewData}
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

      <div className="mobile-content-grid">
        {/* Primary Financial Metrics */}
        {dashboardStats && (
          <>
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Primary Financial Metrics</CardTitle>
                <CardDescription>
                  Core community savings overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Community Value"
                    value={formatCurrency(dashboardStats.totalCommunityValue)}
                    subtitle="Savings + Active Loans + Interest"
                    icon={DollarSign}
                    trend="up"
                  />
                  <StatCard
                    title="Available Funds"
                    value={formatCurrency(dashboardStats.availableFunds)}
                    subtitle="Ready for lending"
                    icon={TrendingUp}
                    trend="neutral"
                  />
                  <StatCard
                    title="Active Loans Principal"
                    value={formatCurrency(dashboardStats.activeLoansPrincipal)}
                    subtitle="Outstanding loan amounts"
                    icon={FileText}
                    trend="neutral"
                  />
                  <StatCard
                    title="Total Members"
                    value={dashboardStats.totalMembers.toString()}
                    subtitle={`${dashboardStats.activeMembers} active`}
                    icon={Users}
                    trend="up"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Secondary Metrics */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Secondary Metrics</CardTitle>
                <CardDescription>
                  Interest and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Expected Yearly Interest"
                    value={formatCurrency(
                      dashboardStats.expectedYearlyInterest
                    )}
                    subtitle="From active loans"
                    icon={TrendingUp}
                    trend="up"
                  />
                  <StatCard
                    title="Interest Earned (All Time)"
                    value={formatCurrency(dashboardStats.totalInterestEarned)}
                    subtitle="Total collected"
                    icon={DollarSign}
                    trend="up"
                  />
                  <StatCard
                    title="Loan-to-Savings Ratio"
                    value={`${(dashboardStats.loanToSavingsRatio * 100).toFixed(
                      1
                    )}%`}
                    subtitle="Risk indicator"
                    icon={AlertCircle}
                    trend={
                      dashboardStats.loanToSavingsRatio > 0.8
                        ? "down"
                        : "neutral"
                    }
                  />
                  <StatCard
                    title="Monthly Contributions"
                    value={formatCurrency(dashboardStats.monthlyContributions)}
                    subtitle="Current month savings"
                    icon={CheckCircle}
                    trend="up"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Loan Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Loan Requests
            </CardTitle>
            <CardDescription>Pending loan applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mobile-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Borrower</TableHead>
                    <TableHead className="min-w-[100px]">Amount</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLoans.length > 0 ? (
                    recentLoans.map((loan) => (
                      <TableRow key={loan._id.toString()}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>
                              {(loan.userId as any)?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(loan.userId as any)?.memberId || "No ID"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatCurrency(loan.requestedAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(loan.status)}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">
                          {formatDate(loan.requestDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        <div className="text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p>No pending loan requests</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* New Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New Members
            </CardTitle>
            <CardDescription>
              Members who joined in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mobile-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Name</TableHead>
                    <TableHead className="min-w-[100px]">Member ID</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">
                      Join Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.length > 0 ? (
                    recentUsers.map((user) => (
                      <TableRow key={user._id.toString()}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.memberId}</TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">
                          {formatDate(user.joinDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6">
                        <div className="text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <p>No new members in the last 30 days</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Contributions */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Contributions
            </CardTitle>
            <CardDescription>
              Contributions awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mobile-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Member</TableHead>
                    <TableHead className="min-w-[100px]">Amount</TableHead>
                    <TableHead className="min-w-[120px]">Month</TableHead>
                    <TableHead className="min-w-[100px]">
                      Payment Method
                    </TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingContributions.length > 0 ? (
                    pendingContributions.map((contribution) => (
                      <TableRow key={contribution._id.toString()}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>
                              {(contribution.userId as any)?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(contribution.userId as any)?.memberId ||
                                "No ID"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatCurrency(contribution.amount)}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            contribution.month + "-01"
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="capitalize">
                          {contribution.paymentMethod || "Not specified"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">
                          {contribution.paidDate
                            ? formatDate(contribution.paidDate)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <div className="text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p>No pending contributions</p>
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
    </div>
  );
}
