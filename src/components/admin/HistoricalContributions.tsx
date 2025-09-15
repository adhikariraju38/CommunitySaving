"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SearchableSelect from "@/components/ui/searchable-select";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, formatCurrency } from "@/lib/utils";
import { COMMUNITY_CONFIG, formatCommunityAge } from "@/config/community";
import { showToast, historicalToasts } from "@/lib/toast";

interface User {
  _id: string;
  name: string;
  email: string;
  memberId: string;
  joinDate: string;
}

interface ContributionStatus {
  isCurrent: boolean;
  totalRequired: number;
  totalMissing: number;
  totalPaid: number;
  totalPending: number;
  requiredMonthsCount: number;
  missingMonthsCount: number;
  paidMonthsCount: number;
  pendingMonthsCount: number;
}

interface MonthInfo {
  month: string;
  year: number;
  monthName: string;
}

interface HistoricalContributionData {
  user: User;
  contributionStatus: ContributionStatus;
  requiredMonths: MonthInfo[];
  missingMonths: MonthInfo[];
  existingContributions: any[];
}

export default function HistoricalContributions() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userContributionData, setUserContributionData] =
    useState<HistoricalContributionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [contributionAmount, setContributionAmount] = useState(
    COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT.toString()
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      // Get all users with a high limit and sort by name for better UX
      const params = new URLSearchParams({
        limit: '1000', // High limit to get all users
        sortBy: 'name',
        sortOrder: 'asc'
      });
      const result = await apiRequest<any>(`/api/users?${params.toString()}`);
      if (result.success && result.data) {
        // Handle both direct array and paginated response
        const usersArray = Array.isArray(result.data) ? result.data : result.data.data;
        if (usersArray) {
          setUsers(usersArray.filter((u: User) => u.memberId)); // Only users with member IDs
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Load users on component mount and auto-select from URL
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Auto-select member from URL parameter
  useEffect(() => {
    const memberIdFromUrl = searchParams.get('memberId');
    if (memberIdFromUrl && memberIdFromUrl !== selectedUserId) {
      setSelectedUserId(memberIdFromUrl);
      loadUserContributionStatus(memberIdFromUrl);
    }
  }, [searchParams, selectedUserId]);

  const loadUserContributionStatus = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      const result = await apiRequest<HistoricalContributionData>(
        `/api/historical-contributions?userId=${userId}`
      );
      if (result.success && result.data) {
        setUserContributionData(result.data);
        setSelectedMonths(new Set()); // Reset selected months
      }
    } catch (error) {
      console.error("Error loading user contribution status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      loadUserContributionStatus(userId);
    } else {
      setUserContributionData(null);
    }
  };

  const toggleMonthSelection = (month: string) => {
    const newSelected = new Set(selectedMonths);
    if (newSelected.has(month)) {
      newSelected.delete(month);
    } else {
      newSelected.add(month);
    }
    setSelectedMonths(newSelected);
  };

  const selectAllMissingMonths = () => {
    if (!userContributionData) return;

    if (selectedMonths.size === userContributionData.missingMonths.length) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(
        new Set(userContributionData.missingMonths.map((m) => m.month))
      );
    }
  };

  const createHistoricalContributions = async () => {
    if (!selectedUserId || selectedMonths.size === 0) {
      showToast.warning(
        "Selection required",
        "Please select a user and at least one month"
      );
      return;
    }

    setProcessing(true);
    try {
      const result = await apiRequest("/api/historical-contributions", {
        method: "POST",
        body: JSON.stringify({
          userId: selectedUserId,
          months: Array.from(selectedMonths),
          amount:
            parseFloat(contributionAmount) ||
            COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT,
          paymentMethod,
          notes: notes.trim(),
          markAsPaid,
        }),
      });

      if (result.success) {
        const data = result.data as any;
        historicalToasts.created(data.created.length, data.existing.length);

        // Reload user data
        await loadUserContributionStatus(selectedUserId);
        // Reset form
        setSelectedMonths(new Set());
        setNotes("");
      } else {
        showToast.error(
          "Failed to create contributions",
          result.message || result.error || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error creating historical contributions:", error);
      showToast.error(
        "Failed to create contributions",
        "An error occurred while processing your request"
      );
    } finally {
      setProcessing(false);
    }
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
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Historical Contributions</h2>
          <p className="text-muted-foreground">
            Manage catch-up contributions for all members. All members must
            contribute from{" "}
            <span className="font-semibold">
              {COMMUNITY_CONFIG.OPENING_DATE.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>{" "}
            (community opening date) regardless of when they joined.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Community has been active for {formatCommunityAge()}
          </p>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900">Policy Examples:</p>
            <ul className="text-blue-800 mt-1 space-y-1">
              <li>
                • All members contribute from Sept 15, 2023 (community opening)
              </li>
              <li>
                • New members must catch up on all months from Sept 15, 2023
              </li>
              <li>• All members contribute up to current month</li>
            </ul>
          </div>
        </div>

        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Member</CardTitle>
            <CardDescription>
              Choose a member to view and manage their historical contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                {usersLoading ? (
                  <div className="space-y-2">
                    <Label htmlFor="user-select">Member</Label>
                    <div className="text-sm text-muted-foreground">
                      Loading users...
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    id="user-select"
                    label="Member"
                    value={selectedUserId}
                    onChange={handleUserSelect}
                    options={users.map((user) => ({
                      value: user._id,
                      label: `${user.name} (${user.memberId})`,
                      searchText: `${user.name} ${user.memberId} ${user.email}`
                    }))}
                    placeholder="Select a member"
                    searchPlaceholder="Search by name, member ID, or email..."
                    emptyText="No members found"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Contribution Status */}
      {selectedUserId && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userContributionData ? (
            <div className="space-y-6">
              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Contribution Status: {userContributionData.user.name}
                  </CardTitle>
                  <CardDescription>
                    Member ID: {userContributionData.user.memberId} | Joined:{" "}
                    {formatDate(userContributionData.user.joinDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div
                        className={`text-2xl font-bold ${userContributionData.contributionStatus.isCurrent
                          ? "text-green-600"
                          : "text-red-600"
                          }`}
                      >
                        {userContributionData.contributionStatus.isCurrent
                          ? "CURRENT"
                          : "BEHIND"}
                      </div>
                      <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(
                          userContributionData.contributionStatus.totalMissing
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Missing (
                        {
                          userContributionData.contributionStatus
                            .missingMonthsCount
                        }{" "}
                        months)
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          userContributionData.contributionStatus.totalPaid
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paid (
                        {
                          userContributionData.contributionStatus
                            .paidMonthsCount
                        }{" "}
                        months)
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(
                          userContributionData.contributionStatus.totalPending
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pending (
                        {
                          userContributionData.contributionStatus
                            .pendingMonthsCount
                        }{" "}
                        months)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Missing Months - Bulk Add */}
              {userContributionData.missingMonths.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Add Missing Contributions</CardTitle>
                    <CardDescription>
                      Select months to create historical contribution records
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contribution Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (NPR)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={contributionAmount}
                          onChange={(e) =>
                            setContributionAmount(e.target.value)
                          }
                          placeholder={COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT.toString()}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-method">Payment Method</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">
                              Bank Transfer
                            </SelectItem>
                            <SelectItem value="mobile_money">
                              Mobile Money
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mark-paid">Status</Label>
                        <Select
                          value={markAsPaid.toString()}
                          onValueChange={(value) =>
                            setMarkAsPaid(value === "true")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Mark as Paid</SelectItem>
                            <SelectItem value="false">
                              Mark as Pending
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Historical contribution catch-up..."
                        rows={2}
                      />
                    </div>

                    {/* Month Selection */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            Missing Months (
                            {userContributionData.missingMonths.length})
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Selected: {selectedMonths.size} | Total:{" "}
                            {formatCurrency(
                              selectedMonths.size *
                              (parseFloat(contributionAmount) ||
                                COMMUNITY_CONFIG.DEFAULT_CONTRIBUTION_AMOUNT)
                            )}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={selectAllMissingMonths}
                          size="sm"
                        >
                          {selectedMonths.size ===
                            userContributionData.missingMonths.length
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4 max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {userContributionData.missingMonths.map(
                            (monthInfo) => (
                              <div
                                key={monthInfo.month}
                                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                              >
                                <input
                                  type="checkbox"
                                  id={`month-${monthInfo.month}`}
                                  checked={selectedMonths.has(monthInfo.month)}
                                  onChange={() =>
                                    toggleMonthSelection(monthInfo.month)
                                  }
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <label
                                  htmlFor={`month-${monthInfo.month}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {monthInfo.monthName}
                                </label>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={createHistoricalContributions}
                        disabled={selectedMonths.size === 0 || processing}
                        size="lg"
                      >
                        {processing
                          ? "Creating..."
                          : `Create ${selectedMonths.size} Contributions`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Existing Contributions */}
              <Card>
                <CardHeader>
                  <CardTitle>Contribution History</CardTitle>
                  <CardDescription>
                    All contribution records for this member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userContributionData.existingContributions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Paid Date</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Recorded By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userContributionData.existingContributions.map(
                            (contribution) => (
                              <TableRow key={contribution._id}>
                                <TableCell className="font-medium">
                                  {new Date(
                                    contribution.month + "-01"
                                  ).toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(contribution.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={getStatusColor(
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
                                <TableCell className="capitalize">
                                  {contribution.paymentMethod || "-"}
                                </TableCell>
                                <TableCell>
                                  {contribution.recordedBy?.name || "-"}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">
                        No contributions found
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                Failed to load contribution data
              </p>
              <Button
                onClick={() => loadUserContributionStatus(selectedUserId)}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
