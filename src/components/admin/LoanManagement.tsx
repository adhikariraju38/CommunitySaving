"use client";

import { useState, useEffect, useCallback } from "react";
import { calculateProratedInterest } from "@/lib/loan-calculations";
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
import NepaliDatePicker from "@/components/ui/nepali-date-picker";
import SearchableSelect from "@/components/ui/searchable-select";

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

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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

  // Active loans pagination and search state
  const [activeLoansSearch, setActiveLoansSearch] = useState("");
  const [activeLoansPage, setActiveLoansPage] = useState(1);
  const [activeLoansHasMore, setActiveLoansHasMore] = useState(true);
  const [activeLoansLoading, setActiveLoansLoading] = useState(false);

  // Modal states
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementLoan, setSettlementLoan] = useState<Loan | null>(null);

  // Settlement states
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settlementCalculations, setSettlementCalculations] = useState<{
    interestOnly: { amount: number; fromDate: string; toDate: string; monthsElapsed: number };
    full: { amount: number; interestAmount: number; principalAmount: number };
  } | null>(null);

  // Direct loan creation states
  const [showCreateLoanForm, setShowCreateLoanForm] = useState(false);
  const [recalculatingInterest, setRecalculatingInterest] = useState(false);
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
    loadActiveLoans(true); // Initial load
    loadUsers();
  }, []);

  // Debounced search effect for active loans
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeLoansSearch !== "") {
        setActiveLoansPage(1);
        loadActiveLoans(true); // Reset and search
      } else {
        setActiveLoansPage(1);
        loadActiveLoans(true); // Reset to show all
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeLoansSearch]);

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

  const loadActiveLoans = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setActiveLoansLoading(true);
      setActiveLoansPage(1);
      setActiveLoans([]);
      setActiveLoansHasMore(true);
    } else {
      setActiveLoansLoading(true);
    }

    try {
      const currentPage = reset ? 1 : activeLoansPage;

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy: 'requestDate',
        sortOrder: 'desc'
      });

      // Add search parameter if search term exists
      if (activeLoansSearch.trim()) {
        params.append('search', activeLoansSearch.trim());
      }

      // Load both approved and disbursed loans separately and combine
      const approvedParams = new URLSearchParams(params);
      approvedParams.set('status', 'approved');

      const disbursedParams = new URLSearchParams(params);
      disbursedParams.set('status', 'disbursed');

      const [approvedResult, disbursedResult] = await Promise.all([
        apiRequest<any>(`/api/loans?${approvedParams.toString()}`),
        apiRequest<any>(`/api/loans?${disbursedParams.toString()}`)
      ]);

      let newLoans: Loan[] = [];
      let hasMoreData = false;

      if (approvedResult.success && approvedResult.data) {
        newLoans = [...newLoans, ...approvedResult.data];
        hasMoreData = hasMoreData || (approvedResult as any).pagination?.hasNext || false;
      }

      if (disbursedResult.success && disbursedResult.data) {
        newLoans = [...newLoans, ...disbursedResult.data];
        hasMoreData = hasMoreData || (disbursedResult as any).pagination?.hasNext || false;
      }

      // Sort combined results by requestDate desc
      newLoans.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

      if (reset) {
        setActiveLoans(newLoans);
      } else {
        setActiveLoans(prev => [...prev, ...newLoans]);
      }

      setActiveLoansHasMore(hasMoreData);
      setActiveLoansPage(currentPage + 1);
    } catch (error) {
      console.error("Error loading active loans:", error);
    } finally {
      setActiveLoansLoading(false);
      if (reset) {
        setLoading(false);
      }
    }
  }, [activeLoansPage, activeLoansSearch]);

  const loadUsers = async () => {
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
          setUsers(usersArray.filter((u: User) => u.isActive && u.memberId));
        }
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

  const calculateSettlementAmounts = useCallback((loan: Loan, settlementDateStr: string) => {
    const settlementDateObj = new Date(settlementDateStr);
    const principal = loan.approvedAmount || loan.requestedAmount;

    // Calculate prorated interest
    const interestCalc = calculateProratedInterest(loan as any, settlementDateObj);

    return {
      interestOnly: {
        amount: interestCalc.interestAmount,
        fromDate: interestCalc.fromDate.toISOString().split('T')[0],
        toDate: interestCalc.toDate.toISOString().split('T')[0],
        monthsElapsed: interestCalc.monthsElapsed
      },
      full: {
        amount: principal + interestCalc.interestAmount,
        interestAmount: interestCalc.interestAmount,
        principalAmount: principal
      }
    };
  }, []);

  const handleSettlement = (loan: Loan) => {
    setSettlementLoan(loan);
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setShowSettlementModal(true);

    // Calculate initial settlement amounts
    const calculations = calculateSettlementAmounts(loan, new Date().toISOString().split('T')[0]);
    setSettlementCalculations(calculations);
  };

  // Recalculate settlement amounts when date changes
  useEffect(() => {
    if (settlementLoan && settlementDate) {
      const calculations = calculateSettlementAmounts(settlementLoan, settlementDate);
      setSettlementCalculations(calculations);
    }
  }, [settlementLoan, settlementDate, calculateSettlementAmounts]);

  const processSettlement = async (
    settlementType: "interest-only" | "full"
  ) => {
    if (!settlementLoan || !settlementCalculations) return;

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

      let paymentAmount = 0;
      let principalAmount = 0;
      let interestAmount = 0;
      let notes = "";

      if (settlementType === "interest-only") {
        paymentAmount = settlementCalculations.interestOnly.amount;
        principalAmount = 0;
        interestAmount = settlementCalculations.interestOnly.amount;
        const fromDate = new Date(settlementCalculations.interestOnly.fromDate).toLocaleDateString();
        const toDate = new Date(settlementCalculations.interestOnly.toDate).toLocaleDateString();
        const monthsElapsed = settlementCalculations.interestOnly.monthsElapsed.toFixed(2);
        notes = `Interest-only settlement from ${fromDate} to ${toDate} (${monthsElapsed} months)`;
      } else {
        // Full settlement
        paymentAmount = settlementCalculations.full.amount;
        principalAmount = settlementCalculations.full.principalAmount;
        interestAmount = settlementCalculations.full.interestAmount;
        const fromDate = new Date(settlementCalculations.interestOnly.fromDate).toLocaleDateString();
        const toDate = new Date(settlementCalculations.interestOnly.toDate).toLocaleDateString();
        notes = `Full loan settlement with prorated interest from ${fromDate} to ${toDate}`;
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
            paymentDate: settlementDate,
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
          // Update last interest paid date to the settlement date
          await apiRequest(`/api/loans/${currentLoan._id}`, {
            method: "PUT",
            body: JSON.stringify({
              lastInterestPaidDate: settlementDate,
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
          `${formatCurrency(paymentAmount)} settlement processed for ${currentLoan.userId.name
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

  const recalculateAllLoanInterest = async () => {
    setRecalculatingInterest(true);
    try {
      const result = await apiRequest<{ updatedCount: number, results: any[] }>('/api/admin/recalculate-loan-interest', {
        method: 'POST'
      });

      if (result.success && result.data) {
        showToast.success(
          "Interest recalculation completed",
          `Updated ${result.data.updatedCount} loans with correct interest calculations`
        );
        // Reload data to show updated calculations
        loadPendingLoans();
        loadActiveLoans();
      } else {
        showToast.error(
          "Failed to recalculate interest",
          result.message || "Please try again"
        );
      }
    } catch (error) {
      console.error("Error recalculating loan interest:", error);
      showToast.error(
        "Error recalculating interest",
        "An error occurred while recalculating loan interest"
      );
    } finally {
      setRecalculatingInterest(false);
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={recalculateAllLoanInterest}
              variant="outline"
              disabled={recalculatingInterest}
              className="flex items-center gap-2"
            >
              {recalculatingInterest ? "Recalculating..." : "Recalculate Interest"}
            </Button>
            <Button
              onClick={() => setShowCreateLoanForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Direct Loan
            </Button>
          </div>
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
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div>
                    <CardTitle>Active Loans</CardTitle>
                    <CardDescription>
                      Loans that have been approved and disbursed
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2 min-w-0 sm:w-64">
                    <Input
                      placeholder="Search by borrower name..."
                      value={activeLoansSearch}
                      onChange={(e) => setActiveLoansSearch(e.target.value)}
                      className="flex-1"
                    />
                    {activeLoansSearch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveLoansSearch("")}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeLoans.length === 0 && !activeLoansLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {activeLoansSearch ? "No loans found matching your search" : "No active loans"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
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

                    {/* Infinite scroll controls */}
                    <div className="flex justify-center py-4">
                      {activeLoansLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">Loading more loans...</span>
                        </div>
                      ) : activeLoansHasMore ? (
                        <Button
                          variant="outline"
                          onClick={() => loadActiveLoans(false)}
                          disabled={activeLoansLoading}
                        >
                          Load More Loans
                        </Button>
                      ) : activeLoans.length > 0 ? (
                        <p className="text-sm text-muted-foreground">No more loans to load</p>
                      ) : null}
                    </div>
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
                    <SearchableSelect
                      id="create-user"
                      label="Member"
                      value={createLoanData.userId}
                      onChange={(value) =>
                        setCreateLoanData({ ...createLoanData, userId: value })
                      }
                      options={users.map((user) => ({
                        value: user._id,
                        label: `${user.name} (${user.memberId})`,
                        searchText: `${user.name} ${user.memberId} ${user.email}`
                      }))}
                      placeholder="Select member"
                      searchPlaceholder="Search by name, member ID, or email..."
                      required
                      emptyText="No members found"
                    />
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
                    <NepaliDatePicker
                      id="create-approval-date"
                      label="Approval Date"
                      value={createLoanData.approvalDate}
                      onChange={(adDate) =>
                        setCreateLoanData({
                          ...createLoanData,
                          approvalDate: adDate,
                        })
                      }
                      placeholder="Select approval date"
                      showTodayButton={true}
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

                {/* Settlement Date Selection */}
                <div className="space-y-2">
                  <Label htmlFor="settlement-date">Settlement Date</Label>
                  <Input
                    id="settlement-date"
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select the date when the settlement payment will be made
                  </p>
                </div>

                {settlementCalculations && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Settlement Options:</h3>

                    {/* Period Info */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Interest Period:</strong> {new Date(settlementCalculations.interestOnly.fromDate).toLocaleDateString()} to {new Date(settlementCalculations.interestOnly.toDate).toLocaleDateString()}
                        ({settlementCalculations.interestOnly.monthsElapsed.toFixed(2)} months)
                      </p>
                    </div>

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
                          <p>• Pay only the prorated interest amount</p>
                          <p>• Principal remains active for future use</p>
                          <p className="font-medium text-blue-600">
                            Amount: {formatCurrencyLocal(settlementCalculations.interestOnly.amount)}
                          </p>
                        </div>
                        <Button
                          onClick={() => processSettlement("interest-only")}
                          disabled={processingId === settlementLoan._id || settlementCalculations.interestOnly.amount <= 0}
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
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>• Pay principal + prorated interest</p>
                          <p>• Loan will be completed and closed</p>
                          <div className="bg-gray-50 p-2 rounded text-xs">
                            <div className="flex justify-between">
                              <span>Principal:</span>
                              <span>{formatCurrencyLocal(settlementCalculations.full.principalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Interest:</span>
                              <span>{formatCurrencyLocal(settlementCalculations.full.interestAmount)}</span>
                            </div>
                            <hr className="my-1" />
                            <div className="flex justify-between font-medium">
                              <span>Total:</span>
                              <span>{formatCurrencyLocal(settlementCalculations.full.amount)}</span>
                            </div>
                          </div>
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
                )}

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
