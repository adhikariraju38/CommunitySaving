"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiRequest, getLocalStorage } from "@/lib/utils";
import { LoanDetailsSkeleton } from "@/components/ui/loading-skeletons";
import { showToast, loanToasts } from "@/lib/toast";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  memberId: string;
}

interface Loan {
  _id: string;
  userId: string;
  requestDate: string;
  requestedAmount: number;
  purpose: string;
  status: string;
  approvedAmount?: number;
  interestRate: number;
  totalAmountDue: number;
  remainingBalance: number;
  notes?: string;
  repayments: Repayment[];
}

interface Repayment {
  _id: string;
  amount: number;
  paymentDate: string;
  receiptNumber: string;
  paymentMethod: string;
  notes?: string;
}

interface LoanDetailsProps {
  loanId: string;
  onClose?: () => void;
}

export default function LoanDetails({ loanId, onClose }: LoanDetailsProps) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "cash",
    notes: "",
    paymentType: "combined", // 'principal', 'interest', 'combined'
    principalAmount: "",
    interestAmount: "",
    paymentDate: "",
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const loadLoanDetails = useCallback(async () => {
    try {
      const result = await apiRequest<any>(`/api/loans/${loanId}`);
      if (result.success && (result as any).loan) {
        setLoan((result as any).loan);
      }
    } catch (error) {
      console.error("Error loading loan details:", error);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    const userData = getLocalStorage<User>("user");
    setUser(userData);
    loadLoanDetails();
  }, [loanId, loadLoanDetails]);

  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayment(true);

    try {
      // Prepare payment data with type-specific fields
      const paymentPayload: any = {
        amount: parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes,
        paymentType: paymentData.paymentType,
        paymentDate: paymentData.paymentDate,
      };

      // Add principal/interest breakdown for combined payments
      if (paymentData.paymentType === "combined") {
        paymentPayload.principalAmount =
          parseFloat(paymentData.principalAmount) || 0;
        paymentPayload.interestAmount =
          parseFloat(paymentData.interestAmount) || 0;
      }

      const result = await apiRequest(`/api/loans/${loanId}/repayments`, {
        method: "POST",
        body: JSON.stringify(paymentPayload),
      });

      if (result.success) {
        setPaymentData({
          amount: "",
          paymentMethod: "cash",
          notes: "",
          paymentType: "combined",
          principalAmount: "",
          interestAmount: "",
          paymentDate: "",
        });
        setShowPaymentForm(false);
        // Reload loan details to show updated balance
        loadLoanDetails();

        // Show success toast
        const amount = parseFloat(paymentData.amount) || 0;
        loanToasts.paymentRecorded(amount);
      } else {
        showToast.error(
          "Failed to record payment",
          result.error || result.message || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      showToast.error(
        "Error recording payment",
        "An error occurred while recording the payment"
      );
    } finally {
      setIsSubmittingPayment(false);
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
      case "approved":
        return "bg-green-100 text-green-800";
      case "disbursed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return <LoanDetailsSkeleton />;
  }

  if (!loan) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loan not found.</p>
        </CardContent>
      </Card>
    );
  }

  const canMakePayment =
    user?.role === "admin" ||
    (user?.role === "member" && loan.status === "disbursed");
  const totalPaid = loan.repayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return (
    <div className="">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Loan Details</h2>
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            size="sm"
            className="w-fit"
          >
            Close
          </Button>
        )}
      </div>

      <Card className="mt-4 sm:mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">
              Loan #{loan._id.slice(-8)}
            </CardTitle>
            <Badge className={getStatusColor(loan.status)}>
              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-medium">Request Date</Label>
              <p>{formatDate(loan.requestDate)}</p>
            </div>
            <div>
              <Label className="font-medium">Requested Amount</Label>
              <p className="text-lg font-semibold">
                {formatCurrency(loan.requestedAmount)}
              </p>
            </div>
            {loan.approvedAmount && (
              <>
                <div>
                  <Label className="font-medium">Approved Amount</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(loan.approvedAmount)}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Interest Rate</Label>
                  <p>{loan.interestRate}% per annum</p>
                </div>
              </>
            )}
          </div>

          {loan.status !== "pending" && loan.status !== "rejected" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
              <div className="text-center">
                <Label className="font-medium text-xs sm:text-sm">
                  Total Due
                </Label>
                <p className="text-lg sm:text-xl font-bold">
                  {formatCurrency(loan.totalAmountDue)}
                </p>
              </div>
              <div className="text-center">
                <Label className="font-medium text-xs sm:text-sm">
                  Total Paid
                </Label>
                <p className="text-lg sm:text-xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="text-center">
                <Label className="font-medium text-xs sm:text-sm">
                  Remaining Balance
                </Label>
                <p className="text-lg sm:text-xl font-bold text-red-600">
                  {formatCurrency(loan.remainingBalance)}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label className="font-medium">Purpose</Label>
            <p className="mt-1 text-sm bg-gray-50 p-3 rounded">
              {loan.purpose}
            </p>
          </div>

          {loan.notes && (
            <div>
              <Label className="font-medium">Admin Notes</Label>
              <p className="mt-1 text-sm bg-blue-50 p-3 rounded">
                {loan.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {loan.repayments?.length > 0 && (
        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[120px]">Amount</TableHead>
                    <TableHead className="min-w-[80px]">Method</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">
                      Receipt #
                    </TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">
                      Notes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loan.repayments && loan.repayments?.length > 0 ? (
                    loan.repayments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="text-xs sm:text-sm">
                          {formatDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize text-xs sm:text-sm">
                          {payment.paymentMethod}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                          {payment.receiptNumber}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-6 sm:py-8"
                      >
                        <div className="text-muted-foreground">
                          <p>No payments made yet</p>
                          <p className="text-sm mt-1">
                            Payment history will appear here once payments are
                            recorded
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {canMakePayment && loan.remainingBalance > 0 && (
        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {!showPaymentForm ? (
              <Button onClick={() => setShowPaymentForm(true)}>
                Add Payment
              </Button>
            ) : (
              <form onSubmit={handleRepayment} className="space-y-4">
                {/* Payment Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <select
                    id="paymentType"
                    value={paymentData.paymentType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setPaymentData((prev) => ({
                        ...prev,
                        paymentType: newType,
                        // Reset amount fields when type changes
                        amount: newType === "combined" ? prev.amount : "",
                        principalAmount: "",
                        interestAmount: "",
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="principal">Principal Only</option>
                    <option value="interest">Interest Only</option>
                    <option value="combined">
                      Combined (Principal + Interest)
                    </option>
                  </select>
                </div>

                {/* Payment Amount Fields */}
                {paymentData.paymentType === "combined" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="principalAmount">Principal Amount</Label>
                      <Input
                        id="principalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={loan.remainingBalance}
                        value={paymentData.principalAmount}
                        onChange={(e) => {
                          const principalAmt = parseFloat(e.target.value) || 0;
                          const interestAmt =
                            parseFloat(paymentData.interestAmount) || 0;
                          setPaymentData((prev) => ({
                            ...prev,
                            principalAmount: e.target.value,
                            amount: (principalAmt + interestAmt).toString(),
                          }));
                        }}
                        placeholder={`Max: ${formatCurrency(
                          loan.remainingBalance
                        )}`}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestAmount">Interest Amount</Label>
                      <Input
                        id="interestAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentData.interestAmount}
                        onChange={(e) => {
                          const principalAmt =
                            parseFloat(paymentData.principalAmount) || 0;
                          const interestAmt = parseFloat(e.target.value) || 0;
                          setPaymentData((prev) => ({
                            ...prev,
                            interestAmount: e.target.value,
                            amount: (principalAmt + interestAmt).toString(),
                          }));
                        }}
                        placeholder="Interest amount"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      {paymentData.paymentType === "principal"
                        ? "Principal"
                        : "Interest"}{" "}
                      Amount
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={
                        paymentData.paymentType === "principal"
                          ? loan.remainingBalance
                          : undefined
                      }
                      value={paymentData.amount}
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder={
                        paymentData.paymentType === "principal"
                          ? `Max: ${formatCurrency(loan.remainingBalance)}`
                          : "Interest amount"
                      }
                      required
                    />
                  </div>
                )}

                {/* Total Amount Display for Combined Payments */}
                {paymentData.paymentType === "combined" && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Total Payment:{" "}
                      {formatCurrency(parseFloat(paymentData.amount) || 0)}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Principal:{" "}
                      {formatCurrency(
                        parseFloat(paymentData.principalAmount) || 0
                      )}{" "}
                      | Interest:{" "}
                      {formatCurrency(
                        parseFloat(paymentData.interestAmount) || 0
                      )}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <select
                      id="paymentMethod"
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
                      <option value="check">Check</option>
                      <option value="settlement">Settlement</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={
                        paymentData.paymentDate ||
                        new Date().toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        setPaymentData((prev) => ({
                          ...prev,
                          paymentDate: e.target.value,
                        }))
                      }
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
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

                {/* Payment Impact Information */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Payment Impact:
                  </p>
                  {paymentData.paymentType === "principal" && (
                    <p className="text-xs text-gray-700">
                      • Reduces remaining loan balance • Does not affect
                      interest calculations
                    </p>
                  )}
                  {paymentData.paymentType === "interest" && (
                    <p className="text-xs text-gray-700">
                      • Covers interest charges only • Loan balance remains
                      unchanged • Updates interest payment history
                    </p>
                  )}
                  {paymentData.paymentType === "combined" && (
                    <p className="text-xs text-gray-700">
                      • Principal portion reduces loan balance • Interest
                      portion covers interest charges • Both amounts are tracked
                      separately
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPaymentData({
                        amount: "",
                        paymentMethod: "cash",
                        notes: "",
                        paymentType: "combined",
                        principalAmount: "",
                        interestAmount: "",
                        paymentDate: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingPayment}>
                    {isSubmittingPayment ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
