"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/utils";
import { UserListSkeleton } from "@/components/ui/loading-skeletons";
import { showToast, loanToasts } from "@/lib/toast";

interface Loan {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    memberId: string;
  };
  requestDate: string;
  requestedAmount: number;
  purpose: string;
  status: string;
  approvedAmount?: number;
  interestRate: number;
  notes?: string;
}

export default function LoanApproval() {
  const [pendingLoans, setPendingLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvalData, setApprovalData] = useState<{
    [key: string]: {
      approvedAmount: string;
      notes: string;
    };
  }>({});

  useEffect(() => {
    loadPendingLoans();
  }, []);

  const loadPendingLoans = async () => {
    try {
      const result = await apiRequest<{ data: Loan[] }>(
        "/api/loans?status=pending"
      );
      if (result.success && result.data && result.data.data) {
        setPendingLoans(result.data.data);
      }
    } catch (error) {
      console.error("Error loading pending loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalDataChange = (
    loanId: string,
    field: string,
    value: string
  ) => {
    setApprovalData((prev) => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        [field]: value,
      },
    }));
  };

  const handleLoanDecision = async (
    loanId: string,
    decision: "approve" | "reject"
  ) => {
    setProcessingId(loanId);

    try {
      const loan = pendingLoans.find((l) => l._id === loanId);
      const approvalInfo = approvalData[loanId] || {
        approvedAmount: "",
        notes: "",
      };

      const payload: any = {
        status: decision === "approve" ? "approved" : "rejected",
        notes: approvalInfo.notes,
      };

      if (decision === "approve") {
        payload.approvedAmount =
          parseFloat(approvalInfo.approvedAmount) || loan?.requestedAmount;
        payload.interestRate = 16; // 16% interest rate
      }

      const result = await apiRequest(`/api/loans/${loanId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (result.success) {
        // Remove the loan from pending list
        setPendingLoans((prev) => prev.filter((l) => l._id !== loanId));
        // Clear approval data for this loan
        setApprovalData((prev) => {
          const newData = { ...prev };
          delete newData[loanId];
          return newData;
        });

        // Show success toast
        const borrowerName = loan?.userId?.name || "Unknown borrower";
        loanToasts.processed(decision as "approved" | "rejected", borrowerName);
      } else {
        showToast.error(
          "Failed to process loan",
          result.error || result.message || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error processing loan:", error);
      showToast.error(
        "Error processing loan",
        "An error occurred while processing the loan"
      );
    } finally {
      setProcessingId(null);
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

  if (loading) {
    return <UserListSkeleton />;
  }

  if (pendingLoans?.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            No pending loan requests at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Loan Approvals</h2>
        <Badge variant="secondary">{pendingLoans?.length || 0} pending</Badge>
      </div>

      {pendingLoans && pendingLoans?.length > 0 ? (
        pendingLoans.map((loan) => {
          const approval = approvalData[loan._id] || {
            approvedAmount: "",
            notes: "",
          };

          return (
            <Card key={loan._id} className="w-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {loan.userId.name} ({loan.userId.memberId})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {loan.userId.email} • Requested{" "}
                      {formatDate(loan.requestDate)}
                    </p>
                  </div>
                  <Badge>{loan.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">Requested Amount</Label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(loan.requestedAmount)}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Interest Rate</Label>
                    <p className="text-lg font-semibold">16% per annum</p>
                  </div>
                </div>

                <div>
                  <Label className="font-medium">Purpose</Label>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded">
                    {loan.purpose}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`approved-amount-${loan._id}`}>
                      Approved Amount (leave empty for requested amount)
                    </Label>
                    <Input
                      id={`approved-amount-${loan._id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max={loan.requestedAmount}
                      value={approval.approvedAmount}
                      onChange={(e) =>
                        handleApprovalDataChange(
                          loan._id,
                          "approvedAmount",
                          e.target.value
                        )
                      }
                      placeholder={formatCurrency(loan.requestedAmount)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`notes-${loan._id}`}>
                      Notes (optional)
                    </Label>
                    <Textarea
                      id={`notes-${loan._id}`}
                      rows={2}
                      value={approval.notes}
                      onChange={(e) =>
                        handleApprovalDataChange(
                          loan._id,
                          "notes",
                          e.target.value
                        )
                      }
                      placeholder="Add notes about this decision..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleLoanDecision(loan._id, "reject")}
                    disabled={processingId === loan._id}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {processingId === loan._id ? "Processing..." : "Reject"}
                  </Button>
                  <Button
                    onClick={() => handleLoanDecision(loan._id, "approve")}
                    disabled={processingId === loan._id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingId === loan._id ? "Processing..." : "Approve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">
              <p>No pending loan requests found</p>
              <p className="text-sm mt-1">
                Loan requests will appear here when members submit them for
                approval
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
