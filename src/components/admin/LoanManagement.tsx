"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, formatCurrency } from "@/lib/utils";
import { UserListSkeleton } from "@/components/ui/loading-skeletons";
import { showToast, loanToasts } from "@/lib/toast";
import { CalendarIcon, Plus, Eye, DollarSign, CheckSquare } from "lucide-react";
import LoanDetails from "@/components/shared/LoanDetails";

interface User {
  _id: string;
  name: string;
  email: string;
  memberId: string;
  isActive: boolean;
}

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
  approvedAmount?: number;
  purpose: string;
  status: string;
  interestRate: number;
  approvalDate?: string;
  disbursementDate?: string;
  totalAmountDue: number;
  amountPaid: number;
  remainingBalance: number;
  notes?: string;
  lastInterestPaidDate?: string;
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

export default function LoanManagement({ user }: Props) {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingLoans, setPendingLoans] = useState<Loan[]>([]);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal states
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementLoan, setSettlementLoan] = useState<Loan | null>(null);

  // Direct loan creation states
  const [showCreateLoanForm, setShowCreateLoanForm] = useState(false);
  const [createLoanData, setCreateLoanData] = useState({
    userId: "",
    requestedAmount: "",
    approvedAmount: "",
    purpose: "",
    interestRate: "16",
    approvalDate: "",
    expectedRepaymentDate: "",
    collateral: "",
    guarantor: "",
    guarantorContact: "",
    notes: "",
    status: "approved", // Direct loans start as approved
  });

  // Approval data for pending loans
  const [approvalData, setApprovalData] = useState<{
    [key: string]: {
      approvedAmount: string;
      notes: string;
    };
  }>({});

  useEffect(() => {
    loadPendingLoans();
    loadActiveLoans();
    loadUsers();
  }, []);

  const loadPendingLoans = async () => {
    try {
      const result = await apiRequest<Loan[]>("/api/loans?status=pending");
      if (result.success && result.data) {
        setPendingLoans(result.data);
      }
    } catch (error) {
      console.error("Error loading pending loans:", error);
    }
  };

  const loadActiveLoans = async () => {
    try {
      // Load both approved and disbursed loans as "active"
      const approvedResult = await apiRequest<Loan[]>(
        "/api/loans?status=approved"
      );
      const disbursedResult = await apiRequest<Loan[]>(
        "/api/loans?status=disbursed"
      );

      let allActiveLoans: Loan[] = [];

      if (approvedResult.success && approvedResult.data) {
        allActiveLoans = [...allActiveLoans, ...approvedResult.data];
      }

      if (disbursedResult.success && disbursedResult.data) {
        allActiveLoans = [...allActiveLoans, ...disbursedResult.data];
      }

      setActiveLoans(allActiveLoans);
    } catch (error) {
      console.error("Error loading active loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await apiRequest<User[]>("/api/users");
      if (result.success && result.data) {
        setUsers(result.data.filter((u: User) => u.isActive));
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const processPendingLoan = async (
    loanId: string,
    decision: "approve" | "reject"
  ) => {
    setProcessingId(loanId);
    try {
      const loan = pendingLoans.find((l) => l._id === loanId);
      const approvalInfo = approvalData[loanId] || {
        approvedAmount: loan?.requestedAmount.toString() || "",
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
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (result.success) {
        setPendingLoans((prev) => prev.filter((l) => l._id !== loanId));
        setApprovalData((prev) => {
          const newData = { ...prev };
          delete newData[loanId];
          return newData;
        });

        const borrowerName = loan?.userId?.name || "Unknown borrower";
        loanToasts.processed(
          decision === "approve" ? "approved" : "rejected",
          borrowerName
        );
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

  const createDirectLoan = async () => {
    if (
      !createLoanData.userId ||
      !createLoanData.requestedAmount ||
      !createLoanData.purpose
    ) {
      showToast.warning(
        "Missing required fields",
        "Please fill in all required fields"
      );
      return;
    }

    if (!createLoanData.expectedRepaymentDate) {
      showToast.warning(
        "Missing repayment date",
        "Please specify the expected repayment date"
      );
      return;
    }

    try {
      setProcessingId("creating");

      // First create the loan
      const loanPayload = {
        userId: createLoanData.userId,
        requestedAmount: parseFloat(createLoanData.requestedAmount),
        purpose: createLoanData.purpose,
        expectedRepaymentDate: createLoanData.expectedRepaymentDate,
        interestRate: parseFloat(createLoanData.interestRate) || 16,
        collateral: createLoanData.collateral,
        guarantor: createLoanData.guarantor,
        guarantorContact: createLoanData.guarantorContact,
      };

      const createResult = await apiRequest("/api/loans", {
        method: "POST",
        body: JSON.stringify(loanPayload),
      });

      if (!createResult.success) {
        showToast.error(
          "Failed to create loan",
          createResult.message || "Please try again"
        );
        return;
      }

      const newLoanId = (createResult as any).loan._id;

      // Then approve the loan with custom approval date and amount
      const approvalPayload: any = {
        status: "approved",
        approvedAmount:
          parseFloat(createLoanData.approvedAmount) ||
          parseFloat(createLoanData.requestedAmount),
        interestRate: parseFloat(createLoanData.interestRate) || 16,
        notes: createLoanData.notes,
      };

      // If custom approval date is provided, we'll need to update it after approval
      const approveResult = await apiRequest(`/api/loans/${newLoanId}`, {
        method: "PUT",
        body: JSON.stringify(approvalPayload),
      });

      if (approveResult.success) {
        // If custom approval date is provided, update it separately
        if (createLoanData.approvalDate) {
          await apiRequest(`/api/loans/${newLoanId}/approval-date`, {
            method: "PATCH",
            body: JSON.stringify({
              approvalDate: createLoanData.approvalDate,
            }),
          });
        }

        setShowCreateLoanForm(false);
        setCreateLoanData({
          userId: "",
          requestedAmount: "",
          approvedAmount: "",
          purpose: "",
          interestRate: "16",
          approvalDate: "",
          expectedRepaymentDate: "",
          collateral: "",
          guarantor: "",
          guarantorContact: "",
          notes: "",
          status: "approved",
        });

        loadActiveLoans(); // Reload to show the new loan

        const selectedUser = users.find((u) => u._id === createLoanData.userId);
        showToast.success(
          "Direct loan created successfully",
          `Loan approved for ${selectedUser?.name || "member"}`
        );
      } else {
        showToast.error(
          "Failed to approve loan",
          approveResult.message || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error creating direct loan:", error);
      showToast.error(
        "Error creating loan",
        "An error occurred while creating the loan"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const disburseLoan = async (loanId: string) => {
    setProcessingId(loanId);
    try {
      const result = await apiRequest(`/api/loans/${loanId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "disbursed",
          disbursementDate: new Date().toISOString(),
        }),
      });

      if (result.success) {
        loadActiveLoans(); // Reload active loans
        const loan = activeLoans.find((l) => l._id === loanId);
        loanToasts.processed("disbursed", loan?.userId?.name);
      } else {
        showToast.error(
          "Failed to disburse loan",
          result.error || result.message
        );
      }
    } catch (error) {
      console.error("Error disbursing loan:", error);
      showToast.error(
        "Error disbursing loan",
        "An error occurred while disbursing the loan"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleSettlement = (loan: Loan) => {
    setSettlementLoan(loan);
    setShowSettlementModal(true);
  };

  const processSettlement = async (
    settlementType: "interest-only" | "full"
  ) => {
    if (!settlementLoan) return;

    setProcessingId(settlementLoan._id);
    try {
      // First, get the latest loan data to check current interest payment status
      const loanResult = await apiRequest<any>(
        `/api/loans/${settlementLoan._id}`
      );
      if (!loanResult.success || !(loanResult as any).loan) {
        showToast.error("Error", "Could not load current loan data");
        return;
      }

      const currentLoan = (loanResult as any).loan;
      const principal =
        currentLoan.approvedAmount || currentLoan.requestedAmount;
      const yearlyInterest = principal * (currentLoan.interestRate / 100);

      // Check if interest has already been paid this year
      let interestAlreadyPaidThisYear = false;
      if (currentLoan.lastInterestPaidDate) {
        const lastPaymentYear = new Date(
          currentLoan.lastInterestPaidDate
        ).getFullYear();
        const currentYear = new Date().getFullYear();
        interestAlreadyPaidThisYear = lastPaymentYear === currentYear;
      }

      // Validation for interest-only settlements
      if (settlementType === "interest-only" && interestAlreadyPaidThisYear) {
        showToast.error(
          "Interest already paid",
          `Interest for year ${new Date().getFullYear()} has already been paid on ${new Date(
            currentLoan.lastInterestPaidDate
          ).toLocaleDateString()}`
        );
        setProcessingId(null);
        return;
      }

      let paymentAmount = 0;
      let principalAmount = 0;
      let interestAmount = 0;
      let notes = "";

      if (settlementType === "interest-only") {
        // Case 1: Only pay interest for 1 year, keep principal
        paymentAmount = yearlyInterest;
        principalAmount = 0;
        interestAmount = yearlyInterest;
        notes =
          "Interest-only settlement for 1 year. Principal amount retained.";
      } else {
        // Case 2: Full settlement - adjust based on whether interest was already paid this year
        if (interestAlreadyPaidThisYear) {
          // Only charge principal if interest already paid this year
          paymentAmount = principal;
          principalAmount = principal;
          interestAmount = 0;
          notes =
            "Full settlement - principal only (interest already paid this year).";
        } else {
          // Charge both principal and interest
          paymentAmount = principal + yearlyInterest;
          principalAmount = principal;
          interestAmount = yearlyInterest;
          notes = "Full settlement - principal and 1 year interest paid.";
        }
      }

      // Record the settlement payment
      const paymentResult = await apiRequest(
        `/api/loans/${currentLoan._id}/repayments`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: paymentAmount,
            paymentType:
              settlementType === "interest-only" ? "interest" : "combined",
            principalAmount: principalAmount,
            interestAmount: interestAmount,
            paymentMethod: "settlement",
            notes: notes,
          }),
        }
      );

      if (paymentResult.success) {
        // Update loan based on settlement type
        if (settlementType === "full") {
          await apiRequest(`/api/loans/${currentLoan._id}`, {
            method: "PUT",
            body: JSON.stringify({
              status: "completed",
              actualRepaymentDate: new Date().toISOString(),
            }),
          });
        } else if (settlementType === "interest-only") {
          // Update last interest paid date
          await apiRequest(`/api/loans/${currentLoan._id}`, {
            method: "PUT",
            body: JSON.stringify({
              lastInterestPaidDate: new Date().toISOString(),
            }),
          });
        }

        setShowSettlementModal(false);
        setSettlementLoan(null);
        loadActiveLoans();

        const settlementTypeName =
          settlementType === "interest-only" ? "Interest-only" : "Full";
        showToast.success(
          `${settlementTypeName} settlement completed`,
          `${formatCurrency(paymentAmount)} settlement processed for ${
            currentLoan.userId.name
          }`
        );
      } else {
        showToast.error(
          "Settlement failed",
          paymentResult.message || paymentResult.error || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error processing settlement:", error);
      showToast.error(
        "Settlement error",
        "An error occurred while processing the settlement"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openLoanDetails = (loanId: string) => {
    setSelectedLoanId(loanId);
    setShowLoanDetails(true);
  };

  const formatCurrencyLocal = (amount: number) => {
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
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "disbursed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <UserListSkeleton />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Loan Management</h2>
            <p className="text-muted-foreground">
              Manage loan applications and create direct loans for members
            </p>
          </div>
          <Button
            onClick={() => setShowCreateLoanForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Direct Loan
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <div className="w-full overflow-x-auto tab-scroll-container px-1">
            <TabsList className="grid w-full min-w-[400px] grid-cols-3 gap-1">
              <TabsTrigger
                value="pending"
                className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3"
              >
                <span className="sm:hidden">
                  Pending ({pendingLoans.length})
                </span>
                <span className="hidden sm:inline">
                  Pending ({pendingLoans.length})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3"
              >
                <span className="sm:hidden">Active ({activeLoans.length})</span>
                <span className="hidden sm:inline">
                  Active ({activeLoans.length})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3"
              >
                <span className="sm:hidden">Payments</span>
                <span className="hidden sm:inline">Payment Management</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Loans Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingLoans.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No pending loan applications
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingLoans.map((loan) => (
                  <Card key={loan._id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {loan.userId.name} ({loan.userId.memberId})
                          </CardTitle>
                          <CardDescription>
                            Requested on {formatDate(loan.requestDate)}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(loan.status)}>
                          {loan.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Requested Amount</p>
                          <p>{formatCurrencyLocal(loan.requestedAmount)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Interest Rate</p>
                          <p>{loan.interestRate}%</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-medium">Purpose</p>
                          <p className="text-muted-foreground">
                            {loan.purpose}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`amount-${loan._id}`}>
                            Approved Amount
                          </Label>
                          <Input
                            id={`amount-${loan._id}`}
                            type="number"
                            placeholder={loan.requestedAmount.toString()}
                            value={approvalData[loan._id]?.approvedAmount || ""}
                            onChange={(e) =>
                              setApprovalData((prev) => ({
                                ...prev,
                                [loan._id]: {
                                  ...prev[loan._id],
                                  approvedAmount: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`notes-${loan._id}`}>Notes</Label>
                          <Input
                            id={`notes-${loan._id}`}
                            placeholder="Optional approval notes"
                            value={approvalData[loan._id]?.notes || ""}
                            onChange={(e) =>
                              setApprovalData((prev) => ({
                                ...prev,
                                [loan._id]: {
                                  ...prev[loan._id],
                                  notes: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() =>
                            processPendingLoan(loan._id, "approve")
                          }
                          disabled={processingId === loan._id}
                          size="sm"
                        >
                          {processingId === loan._id
                            ? "Processing..."
                            : "Approve"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => processPendingLoan(loan._id, "reject")}
                          disabled={processingId === loan._id}
                          size="sm"
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Active Loans Tab */}
          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Loans</CardTitle>
                <CardDescription>
                  Loans that have been approved and disbursed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeLoans.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active loans</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Borrower</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Total Due</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeLoans.map((loan) => (
                          <TableRow key={loan._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {loan.userId.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {loan.userId.memberId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatCurrencyLocal(loan.approvedAmount || 0)}
                            </TableCell>
                            <TableCell>{loan.interestRate}%</TableCell>
                            <TableCell>
                              {formatCurrencyLocal(loan.totalAmountDue)}
                            </TableCell>
                            <TableCell>
                              {formatCurrencyLocal(loan.amountPaid)}
                            </TableCell>
                            <TableCell>
                              {formatCurrencyLocal(loan.remainingBalance)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(loan.status)}>
                                {loan.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {loan.status === "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => disburseLoan(loan._id)}
                                    disabled={processingId === loan._id}
                                  >
                                    Disburse
                                  </Button>
                                )}
                                {loan.status === "disbursed" &&
                                  loan.remainingBalance > 0 && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleSettlement(loan)}
                                      disabled={processingId === loan._id}
                                    >
                                      <CheckSquare className="h-4 w-4 mr-1" />
                                      Settlement
                                    </Button>
                                  )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openLoanDetails(loan._id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Management Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>
                  Record interest and principal payments for active loans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Use the individual loan details page to record payments with
                    interest/principal breakdown
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click &quot;Details&quot; on any active loan above to access
                    payment recording
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Create Direct Loan Modal */}
      {showCreateLoanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Create Direct Loan</CardTitle>
                <CardDescription>
                  Issue a loan directly to a member with custom approval date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-user">Member *</Label>
                    <Select
                      value={createLoanData.userId}
                      onValueChange={(value) =>
                        setCreateLoanData({ ...createLoanData, userId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name} ({user.memberId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-requested-amount">
                      Requested Amount *
                    </Label>
                    <Input
                      id="create-requested-amount"
                      type="number"
                      value={createLoanData.requestedAmount}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          requestedAmount: e.target.value,
                        })
                      }
                      placeholder="50000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-approved-amount">
                      Approved Amount
                    </Label>
                    <Input
                      id="create-approved-amount"
                      type="number"
                      value={createLoanData.approvedAmount}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          approvedAmount: e.target.value,
                        })
                      }
                      placeholder="Leave empty to use requested amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-interest-rate">
                      Interest Rate (%)
                    </Label>
                    <Input
                      id="create-interest-rate"
                      type="number"
                      step="0.1"
                      value={createLoanData.interestRate}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          interestRate: e.target.value,
                        })
                      }
                      placeholder="16"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-approval-date">Approval Date</Label>
                    <Input
                      id="create-approval-date"
                      type="date"
                      value={createLoanData.approvalDate}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          approvalDate: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use current date
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-repayment-date">
                      Expected Repayment Date *
                    </Label>
                    <Input
                      id="create-repayment-date"
                      type="date"
                      value={createLoanData.expectedRepaymentDate}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          expectedRepaymentDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-purpose">Purpose *</Label>
                  <Textarea
                    id="create-purpose"
                    value={createLoanData.purpose}
                    onChange={(e) =>
                      setCreateLoanData({
                        ...createLoanData,
                        purpose: e.target.value,
                      })
                    }
                    placeholder="Purpose of the loan..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-guarantor">Guarantor</Label>
                    <Input
                      id="create-guarantor"
                      value={createLoanData.guarantor}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          guarantor: e.target.value,
                        })
                      }
                      placeholder="Guarantor name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-guarantor-contact">
                      Guarantor Contact
                    </Label>
                    <Input
                      id="create-guarantor-contact"
                      value={createLoanData.guarantorContact}
                      onChange={(e) =>
                        setCreateLoanData({
                          ...createLoanData,
                          guarantorContact: e.target.value,
                        })
                      }
                      placeholder="Phone or email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-collateral">Collateral</Label>
                  <Textarea
                    id="create-collateral"
                    value={createLoanData.collateral}
                    onChange={(e) =>
                      setCreateLoanData({
                        ...createLoanData,
                        collateral: e.target.value,
                      })
                    }
                    placeholder="Collateral details..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-notes">Admin Notes</Label>
                  <Textarea
                    id="create-notes"
                    value={createLoanData.notes}
                    onChange={(e) =>
                      setCreateLoanData({
                        ...createLoanData,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Internal notes..."
                    rows={2}
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This loan will be created as
                    &quot;Approved&quot; status. You can disburse it immediately
                    from the Active Loans tab.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateLoanForm(false);
                      setCreateLoanData({
                        userId: "",
                        requestedAmount: "",
                        approvedAmount: "",
                        purpose: "",
                        interestRate: "16",
                        approvalDate: "",
                        expectedRepaymentDate: "",
                        collateral: "",
                        guarantor: "",
                        guarantorContact: "",
                        notes: "",
                        status: "approved",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createDirectLoan}
                    disabled={processingId === "creating"}
                  >
                    {processingId === "creating"
                      ? "Creating..."
                      : "Create Loan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Loan Details Modal */}
      {showLoanDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <LoanDetails
                loanId={selectedLoanId}
                onClose={() => {
                  setShowLoanDetails(false);
                  setSelectedLoanId("");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && settlementLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Loan Settlement
                </CardTitle>
                <CardDescription>
                  Process settlement for {settlementLoan.userId.name} (
                  {settlementLoan.userId.memberId})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Principal Amount:</span>
                    <span>
                      {formatCurrencyLocal(
                        settlementLoan.approvedAmount ||
                          settlementLoan.requestedAmount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Interest Rate:</span>
                    <span>{settlementLoan.interestRate}% per year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Yearly Interest:</span>
                    <span>
                      {formatCurrencyLocal(
                        (settlementLoan.approvedAmount ||
                          settlementLoan.requestedAmount) *
                          (settlementLoan.interestRate / 100)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Current Balance:</span>
                    <span>
                      {formatCurrencyLocal(settlementLoan.remainingBalance)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Settlement Options:</h3>

                  <div className="space-y-4">
                    {/* Interest-Only Settlement Card */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium text-lg">
                          Interest-Only Settlement
                        </h4>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Pay only the yearly interest amount</p>
                        <p>• Principal remains active for future use</p>
                        <p className="font-medium text-blue-600">
                          Amount:{" "}
                          {formatCurrencyLocal(
                            (settlementLoan.approvedAmount ||
                              settlementLoan.requestedAmount) *
                              (settlementLoan.interestRate / 100)
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => processSettlement("interest-only")}
                        disabled={processingId === settlementLoan._id}
                        className="w-full"
                        variant="outline"
                      >
                        {processingId === settlementLoan._id
                          ? "Processing..."
                          : "Pay Interest Only"}
                      </Button>
                    </div>

                    {/* Full Settlement Card */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-lg">Full Settlement</h4>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Pay principal + yearly interest</p>
                        <p>• Loan will be completed and closed</p>
                        <p className="font-medium text-green-600">
                          Amount:{" "}
                          {formatCurrencyLocal(
                            (settlementLoan.approvedAmount ||
                              settlementLoan.requestedAmount) +
                              (settlementLoan.approvedAmount ||
                                settlementLoan.requestedAmount) *
                                (settlementLoan.interestRate / 100)
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => processSettlement("full")}
                        disabled={processingId === settlementLoan._id}
                        className="w-full"
                        variant="default"
                      >
                        {processingId === settlementLoan._id
                          ? "Processing..."
                          : "Complete Settlement"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Settlement payments will be recorded
                    as combined payments with proper principal/interest
                    breakdown.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSettlementModal(false);
                      setSettlementLoan(null);
                    }}
                  >
                    Cancel
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
