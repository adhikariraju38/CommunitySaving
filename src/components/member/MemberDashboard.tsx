"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  apiRequest,
  formatCurrency,
  formatDate,
  getLoanStatusColor,
  getContributionStatusColor,
  getLocalStorage,
} from "@/lib/utils";
import { IMemberStats, ILoan, IContribution } from "@/types";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  PlusCircle,
  FileText,
  AlertCircle,
} from "lucide-react";
import LoanRequestForm from "./LoanRequestForm";
import ContributionHistory from "./ContributionHistory";

interface Props {
  user: {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "member";
    memberId: string;
    phone: string;
    joinDate: string;
    lastLogin?: string;
  };
}

export default function MemberDashboard({ user }: Props) {
  const [stats, setStats] = useState<IMemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showContributionHistory, setShowContributionHistory] = useState(false);

  useEffect(() => {
    loadMemberData();
  }, []);

  const loadMemberData = async () => {
    try {
      const token = getLocalStorage<string>("token");
      const headers = { Authorization: `Bearer ${token}` };

      const result = await apiRequest<IMemberStats>("/api/dashboard", {
        headers,
      });

      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error loading member data:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    description,
    color = "text-gray-600",
  }: {
    icon: any;
    label: string;
    value: string | number;
    description?: string;
    color?: string;
  }) => (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasActiveLoan =
    stats?.currentLoan &&
    ["approved", "disbursed"].includes(stats.currentLoan.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Member Dashboard
          </h2>
          <p className="text-muted-foreground">
            Welcome back, {user.name} ({user.memberId})
          </p>
        </div>
        <div className="flex space-x-2">
          {!hasActiveLoan && (
            <Button size="sm" onClick={() => setShowLoanForm(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Request Loan
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowContributionHistory(!showContributionHistory)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {showContributionHistory ? "Dashboard" : "My Contributions"}
          </Button>
        </div>
      </div>

      {/* Conditional Content */}
      {showContributionHistory ? (
        <ContributionHistory />
      ) : (
        <>
          {/* Statistics Overview */}
          {stats && (
            <div className="stats-grid">
              <StatCard
                icon={DollarSign}
                label="Total Savings"
                value={formatCurrency(stats.totalSavings)}
                description="Your accumulated contributions"
                color="text-green-600"
              />
              <StatCard
                icon={TrendingUp}
                label="Savings Balance"
                value={formatCurrency(stats.savingsBalance)}
                description="Available savings balance"
                color="text-blue-600"
              />
              <StatCard
                icon={CreditCard}
                label="Current Loan"
                value={
                  stats.currentLoan
                    ? formatCurrency(stats.currentLoan.remainingBalance)
                    : "None"
                }
                description={
                  stats.currentLoan ? "Outstanding balance" : "No active loans"
                }
                color={stats.currentLoan ? "text-orange-600" : "text-gray-600"}
              />
              <StatCard
                icon={Calendar}
                label="Member Since"
                value={formatDate(user.joinDate)}
                description="Community membership"
                color="text-purple-600"
              />
            </div>
          )}

          {/* Active Loan Alert */}
          {stats?.currentLoan && (
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-lg">Active Loan</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Amount Borrowed</p>
                    <p className="font-semibold">
                      {formatCurrency(stats.currentLoan.approvedAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining Balance</p>
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(stats.currentLoan.remainingBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Interest Rate</p>
                    <p className="font-semibold">
                      {stats.currentLoan.interestRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-semibold">
                      {formatDate(stats.currentLoan.expectedRepaymentDate)}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Badge
                    className={getLoanStatusColor(stats.currentLoan.status)}
                  >
                    {stats.currentLoan.status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Contributions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Contributions</CardTitle>
                <CardDescription>
                  Your monthly contribution history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats?.contributionHistory &&
                  stats.contributionHistory?.length > 0 ? (
                    stats.contributionHistory.map((contribution) => (
                      <div
                        key={contribution._id.toString()}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{contribution.month}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(contribution.amount)}
                            {contribution.paidDate &&
                              ` - Paid ${formatDate(contribution.paidDate)}`}
                          </p>
                        </div>
                        <Badge
                          className={getContributionStatusColor(
                            contribution.paidStatus
                          )}
                        >
                          {contribution.paidStatus}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No contribution history available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loan History */}
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
                <CardDescription>
                  Your past and current loan applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats?.loanHistory && stats.loanHistory?.length > 0 ? (
                    stats.loanHistory.map((loan) => (
                      <div
                        key={loan._id.toString()}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {formatCurrency(loan.requestedAmount)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Requested: {formatDate(loan.requestDate)}
                            {loan.approvalDate &&
                              ` | Approved: ${formatDate(loan.approvalDate)}`}
                          </p>
                          {loan.remainingBalance > 0 && (
                            <p className="text-sm text-orange-600">
                              Balance: {formatCurrency(loan.remainingBalance)}
                            </p>
                          )}
                        </div>
                        <Badge className={getLoanStatusColor(loan.status)}>
                          {loan.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No loan history available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contribution Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Contribution History</CardTitle>
              <CardDescription>
                Complete record of your monthly contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.contributionHistory
                    ?.slice(0, 10)
                    .map((contribution) => (
                      <TableRow key={contribution._id.toString()}>
                        <TableCell className="font-medium">
                          {contribution.month}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(contribution.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getContributionStatusColor(
                              contribution.paidStatus
                            )}
                          >
                            {contribution.paidStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contribution.paidDate
                            ? formatDate(contribution.paidDate)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {contribution.paymentMethod || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {stats?.contributionHistory &&
                stats.contributionHistory?.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">
                      No contribution records found
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Contact an administrator to set up your monthly
                      contributions
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Loan Request Form Modal */}
      {showLoanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <LoanRequestForm
              onSuccess={() => {
                setShowLoanForm(false);
                loadMemberData(); // Reload data to reflect new loan
              }}
              onCancel={() => setShowLoanForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
