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
import { showToast } from "@/lib/toast";

interface Contribution {
  _id: string;
  amount: number;
  month: string;
  year: number;
  paidStatus: "pending" | "paid" | "overdue";
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  recordedBy?: {
    name: string;
  };
}

export default function ContributionHistory() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7); // YYYY-MM format
  });
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "2000",
    paymentMethod: "cash",
    notes: "",
  });
  const [processing, setProcessing] = useState(false);

  const loadContributions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<Contribution[]>("/api/contributions");
      if (result.success && result.data) {
        setContributions(result.data);
      }
    } catch (error) {
      console.error("Error loading contributions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  const recordContribution = async () => {
    setProcessing(true);
    try {
      const result = await apiRequest("/api/contributions", {
        method: "PATCH",
        body: JSON.stringify({
          action: "member-contribute",
          month: selectedMonth,
          amount: parseFloat(paymentData.amount) || 2000,
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
        }),
      });

      if (result.success) {
        setShowRecordForm(false);
        setPaymentData({ amount: "2000", paymentMethod: "cash", notes: "" });
        loadContributions();
        showToast.success(
          "Contribution recorded successfully!",
          "Your contribution is now pending admin approval"
        );
      } else {
        showToast.error(
          "Failed to record contribution",
          result.message || result.error || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error recording contribution:", error);
      showToast.error(
        "Failed to record contribution",
        "An error occurred while processing your request"
      );
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
      default:
        return "bg-red-100 text-red-800";
    }
  };

  const totalContributions =
    contributions?.reduce(
      (sum, c) => sum + (c.paidStatus === "paid" ? c.amount : 0),
      0
    ) || 0;
  const paidContributions =
    contributions?.filter((c) => c.paidStatus === "paid").length || 0;
  const pendingContributions =
    contributions?.filter((c) => c.paidStatus === "pending").length || 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="mobile-heading">My Contributions</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track your monthly contributions and savings
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor="record-month" className="text-sm font-medium">
              Record for month:
            </Label>
            <Input
              id="record-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto min-w-[140px]"
            />
          </div>
          <Button
            onClick={() => setShowRecordForm(true)}
            className="w-full sm:w-auto"
            size="sm"
          >
            Record My Contribution
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(totalContributions)}
            </div>
            <p className="text-xs text-muted-foreground">Total Savings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {paidContributions}
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {pendingContributions}
            </div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Contributions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contribution History</CardTitle>
          <CardDescription>
            Your monthly contribution records and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : contributions?.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No contribution records found
              </p>
              <p className="text-sm mt-1 text-muted-foreground">
                Contact admin to setup your monthly contributions
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month/Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Recorded</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((contribution) => (
                  <TableRow key={contribution._id}>
                    <TableCell className="font-medium">
                      {new Date(contribution.month + "-01").toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(contribution.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusColor(contribution.paidStatus)}
                      >
                        {contribution.paidStatus === "pending"
                          ? "Pending Approval"
                          : contribution.paidStatus === "paid"
                          ? "Approved"
                          : "Overdue"}
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
                    <TableCell className="max-w-xs truncate">
                      {contribution.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Contribution Modal */}
      {showRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <Card>
              <CardHeader>
                <CardTitle>Record My Contribution</CardTitle>
                <CardDescription>
                  Record your contribution for{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contribution-amount">Amount (NPR)</Label>
                  <Input
                    id="contribution-amount"
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
                  <Label htmlFor="contribution-method">Payment Method</Label>
                  <select
                    id="contribution-method"
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
                  <Label htmlFor="contribution-notes">Notes (optional)</Label>
                  <Textarea
                    id="contribution-notes"
                    rows={2}
                    value={paymentData.notes}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Add any notes about this payment..."
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Your contribution will be marked as
                    &quot;Pending Approval&quot; and will need to be approved by
                    an admin before being marked as paid.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecordForm(false);
                      setPaymentData({
                        amount: "2000",
                        paymentMethod: "cash",
                        notes: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={recordContribution} disabled={processing}>
                    {processing ? "Recording..." : "Record Contribution"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
