"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/utils";
import {
  TableSkeleton,
  StatsCardSkeleton,
} from "@/components/ui/loading-skeletons";
import { showToast, contributionToasts } from "@/lib/toast";

interface User {
  _id: string;
  name: string;
  email: string;
  memberId: string;
  isActive: boolean;
}

interface Contribution {
  _id: string;
  userId: User;
  amount: number;
  month: string;
  year: number;
  paidStatus: "pending" | "paid" | "partial";
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  recordedBy?: User;
}

interface Props {
  user: {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "member";
    memberId: string;
  };
}

export default function ContributionTracking({ user }: Props) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7); // YYYY-MM format
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRecordPaymentForm, setShowRecordPaymentForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [paymentData, setPaymentData] = useState({
    amount: "2000",
    paymentMethod: "cash",
    notes: "",
  });
  const [processing, setProcessing] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showAdminContributionForm, setShowAdminContributionForm] =
    useState(false);
  const [adminContributionData, setAdminContributionData] = useState({
    amount: "2000",
    paymentMethod: "cash",
    notes: "",
  });

  const loadUsers = useCallback(async () => {
    try {
      const result = await apiRequest<User[]>("/api/users");
      if (result.success && result.data) {
        setUsers(result.data.filter((u: User) => u.isActive));
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  const loadContributions = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const result = await apiRequest<Contribution[]>(
        `/api/contributions?month=${selectedMonth}&year=${year}`
      );
      if (result.success && result.data) {
        setContributions(result.data);
      }
    } catch (error) {
      console.error("Error loading contributions:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadContributions();
  }, [selectedMonth, loadContributions]);

  // Member selection functions
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u._id)));
    }
  };

  const createContributionsForMonth = async () => {
    if (selectedUsers.size === 0) {
      contributionToasts.noSelection("members");
      return;
    }

    setProcessing(true);
    try {
      const [year, month] = selectedMonth.split("-");

      const result = await apiRequest("/api/contributions", {
        method: "POST",
        body: JSON.stringify({
          action: "create-monthly",
          year: parseInt(year),
          month: parseInt(month),
          selectedUserIds: Array.from(selectedUsers),
        }),
      });

      if (result.success) {
        setShowCreateForm(false);
        setSelectedUsers(new Set());
        loadContributions();
        contributionToasts.created(selectedUsers.size, "monthly");
      } else {
        contributionToasts.failed(
          "create contributions",
          result.message || result.error
        );
      }
    } catch (error) {
      console.error("Error creating contributions:", error);
      contributionToasts.failed("create contributions");
    } finally {
      setProcessing(false);
    }
  };

  const recordBulkPayments = async () => {
    if (selectedUsers.size === 0) {
      contributionToasts.noSelection("members");
      return;
    }

    setProcessing(true);
    try {
      const [year, month] = selectedMonth.split("-");
      let successCount = 0;
      let errorCount = 0;

      // Record payment for each selected user
      for (const userId of selectedUsers) {
        const contribution = contributions.find(
          (c) => c.userId._id === userId && c.paidStatus === "pending"
        );
        if (contribution) {
          const result = await apiRequest("/api/contributions", {
            method: "POST",
            body: JSON.stringify({
              action: "record-payment",
              userId: userId,
              month: selectedMonth,
              amount: parseFloat(paymentData.amount) || 2000,
              paymentMethod: paymentData.paymentMethod,
              notes: paymentData.notes,
            }),
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(
              `Failed to record payment for user ${userId}:`,
              result.message
            );
          }
        }
      }

      setShowRecordPaymentForm(false);
      setSelectedUsers(new Set());
      setPaymentData({ amount: "2000", paymentMethod: "cash", notes: "" });
      loadContributions();

      if (successCount > 0) {
        const description =
          errorCount > 0
            ? `${successCount} successful, ${errorCount} failed`
            : `Successfully recorded ${successCount} payments`;
        contributionToasts.created(successCount, "payment");
        if (errorCount > 0) {
          showToast.warning(
            "Some payments failed",
            `${errorCount} payments could not be processed`
          );
        }
      } else {
        showToast.warning(
          "No payments recorded",
          "No payments were processed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error recording payments:", error);
      contributionToasts.failed("record payments");
    } finally {
      setProcessing(false);
    }
  };

  const approveBulkContributions = async () => {
    if (selectedUsers.size === 0) {
      contributionToasts.noSelection("contributions");
      return;
    }

    setProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Approve each selected contribution
      for (const userId of selectedUsers) {
        const contribution = contributions.find(
          (c) => c.userId._id === userId && c.paidStatus === "pending"
        );
        if (contribution) {
          const result = await apiRequest("/api/contributions", {
            method: "POST",
            body: JSON.stringify({
              action: "approve-contribution",
              contributionId: contribution._id,
            }),
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(
              `Failed to approve contribution for user ${userId}:`,
              result.message
            );
          }
        }
      }

      setShowApprovalForm(false);
      setSelectedUsers(new Set());
      loadContributions();

      if (successCount > 0) {
        contributionToasts.created(successCount, "approval");
        if (errorCount > 0) {
          showToast.warning(
            "Some approvals failed",
            `${errorCount} contributions could not be approved`
          );
        }
      } else {
        showToast.warning(
          "No contributions approved",
          "No contributions were approved. Please try again."
        );
      }
    } catch (error) {
      console.error("Error approving contributions:", error);
      contributionToasts.failed("approve contributions");
    } finally {
      setProcessing(false);
    }
  };

  // Admin self-contribution function
  const recordAdminContribution = async () => {
    setProcessing(true);
    try {
      const result = await apiRequest("/api/contributions", {
        method: "PATCH", // Using member-contribute action but for admin
        body: JSON.stringify({
          action: "member-contribute",
          userId: user._id, // Admin's own ID
          month: selectedMonth,
          amount: parseFloat(adminContributionData.amount) || 2000,
          paymentMethod: adminContributionData.paymentMethod,
          notes: adminContributionData.notes,
        }),
      });

      if (result.success) {
        setShowAdminContributionForm(false);
        setAdminContributionData({
          amount: "2000",
          paymentMethod: "cash",
          notes: "",
        });
        loadContributions();

        const monthName = new Date(selectedMonth + "-01").toLocaleDateString(
          "en-US",
          {
            month: "long",
            year: "numeric",
          }
        );
        contributionToasts.adminSelfContribution(
          parseFloat(adminContributionData.amount) || 2000,
          monthName
        );
      } else {
        contributionToasts.failed(
          "record admin contribution",
          result.message || result.error
        );
      }
    } catch (error) {
      console.error("Error recording admin contribution:", error);
      contributionToasts.failed("record admin contribution");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalContributions =
    contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
  const paidContributions =
    contributions?.filter((c) => c.paidStatus === "paid").length || 0;
  const pendingContributions =
    contributions?.filter((c) => c.paidStatus === "pending").length || 0;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Title and Description Row */}
          <div>
            <h2 className="mobile-heading">Contribution Tracking</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage monthly contributions and payments
            </p>
          </div>

          {/* Controls Row - Mobile responsive */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="month" className="text-sm font-medium">
                Month:
              </Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto min-w-[140px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto sm:min-w-[140px]"
                size="sm"
              >
                <span className="sm:hidden">Setup</span>
                <span className="hidden sm:inline">Setup Contributions</span>
              </Button>
              <Button
                onClick={() => setShowRecordPaymentForm(true)}
                className="w-full sm:w-auto sm:min-w-[140px]"
                size="sm"
                variant="outline"
              >
                <span className="sm:hidden">Record</span>
                <span className="hidden sm:inline">Record Payments</span>
              </Button>
              <Button
                onClick={() => setShowApprovalForm(true)}
                className="w-full sm:w-auto sm:min-w-[140px]"
                size="sm"
                variant="secondary"
              >
                <span className="sm:hidden">Approve</span>
                <span className="hidden sm:inline">Approve Pending</span>
              </Button>
              <Button
                onClick={() => setShowAdminContributionForm(true)}
                className="w-full sm:w-auto sm:min-w-[140px]"
                size="sm"
                variant="outline"
              >
                <span className="sm:hidden">My Contribution</span>
                <span className="hidden sm:inline">Record My Contribution</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(totalContributions)}
              </div>
              <p className="text-xs text-muted-foreground">Total Expected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {paidContributions}
              </div>
              <p className="text-xs text-muted-foreground">Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {pendingContributions}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {contributions?.length > 0
                  ? Math.round(
                      (paidContributions / (contributions?.length || 1)) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Collection Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Contributions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Contributions</CardTitle>
            <CardDescription>
              Track and record member contributions for{" "}
              {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : contributions?.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  No contributions set up for this month
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setShowCreateForm(true)}
                >
                  Setup Contributions
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Quick Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions && contributions?.length > 0 ? (
                    contributions.map((contribution) => (
                      <TableRow key={contribution._id}>
                        <TableCell className="font-medium">
                          {contribution.userId.name} (
                          {contribution.userId.memberId})
                        </TableCell>
                        <TableCell>
                          {formatCurrency(contribution.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusColor(contribution.paidStatus)}
                          >
                            {contribution.paidStatus.charAt(0).toUpperCase() +
                              contribution.paidStatus.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contribution.paidDate
                            ? formatDate(contribution.paidDate)
                            : "-"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {contribution.paymentMethod || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusColor(contribution.paidStatus)}
                          >
                            {contribution.paidStatus === "pending"
                              ? "Pending Approval"
                              : contribution.paidStatus === "paid"
                              ? "Approved & Paid"
                              : "Overdue"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        <div className="text-muted-foreground">
                          <p>No contribution records found</p>
                          <p className="text-sm mt-1">
                            Use the &ldquo;Setup Month&rdquo; button to create
                            contributions for this month
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Setup Contributions Modal with Member Selection */}
      </div>
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Setup Month Contributions</CardTitle>
                <CardDescription>
                  Select members to create contribution records for{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>• Amount: NPR 2,000 per member</p>
                    <p>• Active members: {users?.length || 0}</p>
                    <p>• Selected: {selectedUsers.size}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedUsers.size === users.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>

                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {users.map((user) => {
                      const hasContribution = contributions.some(
                        (c) => c.userId._id === user._id
                      );
                      return (
                        <div
                          key={user._id}
                          className="flex items-center space-x-3"
                        >
                          <input
                            type="checkbox"
                            id={`user-${user._id}`}
                            checked={selectedUsers.has(user._id)}
                            onChange={() => toggleUserSelection(user._id)}
                            disabled={hasContribution}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor={`user-${user._id}`}
                            className={`flex-1 text-sm ${
                              hasContribution
                                ? "text-gray-400"
                                : "text-gray-700"
                            }`}
                          >
                            {user.name} ({user.memberId})
                            {hasContribution && (
                              <span className="ml-2 text-xs text-green-600">
                                Already exists
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedUsers(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createContributionsForMonth}
                    disabled={selectedUsers.size === 0 || processing}
                  >
                    {processing
                      ? "Creating..."
                      : `Create ${selectedUsers.size} Contributions`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bulk Payment Recording Modal */}
      {showRecordPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Record Bulk Payments</CardTitle>
                <CardDescription>
                  Select members and record their contribution payments for{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-payment-amount">Amount (NPR)</Label>
                    <Input
                      id="bulk-payment-amount"
                      type="number"
                      step="1"
                      min="0"
                      value={paymentData.amount}
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-payment-method">Payment Method</Label>
                    <select
                      id="bulk-payment-method"
                      value={paymentData.paymentMethod}
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_money">Mobile Money</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-payment-notes">Notes (optional)</Label>
                    <Input
                      id="bulk-payment-notes"
                      value={paymentData.notes}
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Payment notes..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>
                      • Pending contributions:{" "}
                      {
                        contributions.filter((c) => c.paidStatus === "pending")
                          .length
                      }
                    </p>
                    <p>• Selected: {selectedUsers.size}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pendingUserIds = contributions
                        .filter((c) => c.paidStatus === "pending")
                        .map((c) => c.userId._id);

                      if (selectedUsers.size === pendingUserIds.length) {
                        setSelectedUsers(new Set());
                      } else {
                        setSelectedUsers(new Set(pendingUserIds));
                      }
                    }}
                  >
                    {selectedUsers.size ===
                    contributions.filter((c) => c.paidStatus === "pending")
                      .length
                      ? "Deselect All"
                      : "Select All Pending"}
                  </Button>
                </div>

                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {contributions.map((contribution) => (
                      <div
                        key={contribution._id}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          id={`payment-${contribution._id}`}
                          checked={selectedUsers.has(contribution.userId._id)}
                          onChange={() =>
                            toggleUserSelection(contribution.userId._id)
                          }
                          disabled={contribution.paidStatus !== "pending"}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label
                          htmlFor={`payment-${contribution._id}`}
                          className={`flex-1 text-sm ${
                            contribution.paidStatus !== "pending"
                              ? "text-gray-400"
                              : "text-gray-700"
                          }`}
                        >
                          {contribution.userId.name} (
                          {contribution.userId.memberId}) -{" "}
                          {formatCurrency(contribution.amount)}
                          <span
                            className={`ml-2 text-xs px-2 py-1 rounded-full ${
                              contribution.paidStatus === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {contribution.paidStatus}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecordPaymentForm(false);
                      setSelectedUsers(new Set());
                      setPaymentData({
                        amount: "2000",
                        paymentMethod: "cash",
                        notes: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={recordBulkPayments}
                    disabled={selectedUsers.size === 0 || processing}
                  >
                    {processing
                      ? "Recording..."
                      : `Record ${selectedUsers.size} Payments`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bulk Approval Modal */}
      {showApprovalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Approve Pending Contributions</CardTitle>
                <CardDescription>
                  Select pending contributions to approve for{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>
                      • Pending contributions:{" "}
                      {
                        contributions.filter((c) => c.paidStatus === "pending")
                          .length
                      }
                    </p>
                    <p>• Selected: {selectedUsers.size}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pendingUserIds = contributions
                        .filter((c) => c.paidStatus === "pending")
                        .map((c) => c.userId._id);

                      if (selectedUsers.size === pendingUserIds.length) {
                        setSelectedUsers(new Set());
                      } else {
                        setSelectedUsers(new Set(pendingUserIds));
                      }
                    }}
                  >
                    {selectedUsers.size ===
                    contributions.filter((c) => c.paidStatus === "pending")
                      .length
                      ? "Deselect All"
                      : "Select All Pending"}
                  </Button>
                </div>

                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {contributions
                      .filter((c) => c.paidStatus === "pending")
                      .map((contribution) => (
                        <div
                          key={contribution._id}
                          className="flex items-center space-x-3"
                        >
                          <input
                            type="checkbox"
                            id={`approve-${contribution._id}`}
                            checked={selectedUsers.has(contribution.userId._id)}
                            onChange={() =>
                              toggleUserSelection(contribution.userId._id)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor={`approve-${contribution._id}`}
                            className="flex-1 text-sm text-gray-700"
                          >
                            <div className="flex justify-between items-center">
                              <span>
                                {contribution.userId.name} (
                                {contribution.userId.memberId}) -{" "}
                                {formatCurrency(contribution.amount)}
                              </span>
                              <div className="text-xs text-gray-500">
                                <div>
                                  Paid:{" "}
                                  {formatDate(contribution.paidDate || "")}
                                </div>
                                <div className="capitalize">
                                  Method: {contribution.paymentMethod || "N/A"}
                                </div>
                                {contribution.notes && (
                                  <div>Notes: {contribution.notes}</div>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    {contributions.filter((c) => c.paidStatus === "pending")
                      .length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No pending contributions to approve
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApprovalForm(false);
                      setSelectedUsers(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={approveBulkContributions}
                    disabled={selectedUsers.size === 0 || processing}
                  >
                    {processing
                      ? "Approving..."
                      : `Approve ${selectedUsers.size} Contributions`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Admin Self-Contribution Modal */}
      {showAdminContributionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Record My Contribution</CardTitle>
                <CardDescription>
                  Record your personal contribution for{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-amount">Amount (NPR)</Label>
                    <Input
                      id="admin-amount"
                      type="number"
                      value={adminContributionData.amount}
                      onChange={(e) =>
                        setAdminContributionData({
                          ...adminContributionData,
                          amount: e.target.value,
                        })
                      }
                      placeholder="2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-payment-method">Payment Method</Label>
                    <select
                      id="admin-payment-method"
                      value={adminContributionData.paymentMethod}
                      onChange={(e) =>
                        setAdminContributionData({
                          ...adminContributionData,
                          paymentMethod: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_money">Mobile Money</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-notes">Notes (optional)</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminContributionData.notes}
                    onChange={(e) =>
                      setAdminContributionData({
                        ...adminContributionData,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Admin contributions are recorded as
                    &quot;pending&quot; and will require approval from another
                    admin or you can approve it yourself.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAdminContributionForm(false);
                      setAdminContributionData({
                        amount: "2000",
                        paymentMethod: "cash",
                        notes: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={recordAdminContribution}
                    disabled={processing}
                  >
                    {processing ? "Recording..." : "Record Contribution"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
