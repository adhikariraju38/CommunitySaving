import { toast } from "sonner";

// Custom toast utilities with consistent styling
export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: (data: T) => string;
      error: (error: any) => string;
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },
};

// Contribution-specific toasts
export const contributionToasts = {
  created: (count: number, type: "monthly" | "payment" | "approval" = "monthly") => {
    const typeMap = {
      monthly: "contributions",
      payment: "payments", 
      approval: "approvals"
    };
    
    showToast.success(
      `Success! ${count} ${typeMap[type]} processed`,
      `Successfully processed ${count} ${typeMap[type]} for selected members`
    );
  },

  failed: (action: string, reason?: string) => {
    showToast.error(
      `Failed to ${action}`,
      reason || "Please try again or contact support if the issue persists"
    );
  },

  noSelection: (type: "members" | "contributions" = "members") => {
    showToast.warning(
      `No ${type} selected`,
      `Please select at least one ${type === "members" ? "member" : "contribution"} to proceed`
    );
  },

  adminSelfContribution: (amount: number, month: string) => {
    showToast.success(
      "Admin contribution recorded",
      `Successfully recorded ${amount} NPR contribution for ${month}`
    );
  }
};

// Loan-specific toasts
export const loanToasts = {
  processed: (action: "approved" | "rejected" | "disbursed", borrower?: string) => {
    showToast.success(
      `Loan ${action}`,
      borrower ? `Loan ${action} for ${borrower}` : `Loan has been ${action}`
    );
  },

  paymentRecorded: (amount: number, borrower?: string) => {
    showToast.success(
      "Payment recorded",
      `${amount} NPR payment recorded${borrower ? ` for ${borrower}` : ""}`
    );
  },
};

// Historical contribution toasts
export const historicalToasts = {
  created: (count: number, existing: number = 0) => {
    let description = `Successfully created ${count} historical contributions`;
    if (existing > 0) {
      description += `. ${existing} months already existed`;
    }
    
    showToast.success(
      "Historical contributions added",
      description
    );
  },
};
