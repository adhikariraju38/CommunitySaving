"use client";

import { useState, useCallback, useRef } from "react";
import { apiRequest, getLocalStorage } from "@/lib/utils";
import { 
  IDashboardStats, 
  IUser, 
  ILoan, 
  IContribution, 
  CommunityFinances,
  PaginatedResponse 
} from "@/types";

// Custom hook for dashboard overview data
export const useDashboardOverview = () => {
  const [dashboardStats, setDashboardStats] = useState<IDashboardStats | null>(null);
  const [recentLoans, setRecentLoans] = useState<ILoan[]>([]);
  const [recentUsers, setRecentUsers] = useState<IUser[]>([]);
  const [pendingContributions, setPendingContributions] = useState<IContribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadOverviewData = useCallback(async () => {
    if (loadingRef.current) return; // Prevent duplicate calls
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const token = getLocalStorage<string>("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Load all overview data in parallel
      const [statsResult, loansResult, usersResult, contributionsResult] = await Promise.all([
        apiRequest<IDashboardStats>("/api/dashboard", { headers }),
        apiRequest<ILoan[]>("/api/loans?status=pending&limit=5", { headers }),
        apiRequest<IUser[]>("/api/users?fromDate=" + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() + "&limit=5", { headers }),
        apiRequest<IContribution[]>("/api/contributions?status=pending&limit=5", { headers })
      ]);

      if (statsResult.success && statsResult.data) {
        setDashboardStats(statsResult.data);
      }

      if (loansResult.success && loansResult.data) {
        setRecentLoans(loansResult.data);
      }

      if (usersResult.success && usersResult.data) {
        setRecentUsers(usersResult.data);
      }

      if (contributionsResult.success && contributionsResult.data) {
        setPendingContributions(contributionsResult.data);
      }

    } catch (err) {
      console.error("Error loading overview data:", err);
      setError("Failed to load overview data");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  return {
    dashboardStats,
    recentLoans,
    recentUsers,
    pendingContributions,
    loading,
    error,
    loadOverviewData
  };
};

// Custom hook for members data
export const useMembersData = () => {
  const [members, setMembers] = useState<IUser[]>([]);
  const [memberContributionStatus, setMemberContributionStatus] = useState<
    Map<string, { isCurrent: boolean; missingCount: number }>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadMembersData = useCallback(async () => {
    if (loadingRef.current) return; // Prevent duplicate calls
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const token = getLocalStorage<string>("token");
      const headers = { Authorization: `Bearer ${token}` };

      const result = await apiRequest<PaginatedResponse<IUser>>("/api/users", { headers });
      
      let membersData: IUser[] = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data.data)) {
          membersData = result.data.data;
        } else if (Array.isArray(result.data)) {
          membersData = result.data;
        }
        setMembers(membersData);

        // Load contribution status for members (limit for performance)
        const statusMap = new Map();
        const membersToCheck = membersData.slice(0, 20);
        
        const statusPromises = membersToCheck.map(async (member) => {
          try {
            const statusResult = await apiRequest(
              `/api/historical-contributions?userId=${member._id}`,
              { headers }
            );
            if (statusResult.success && statusResult.data) {
              const data = statusResult.data as any;
              return {
                memberId: member._id.toString(),
                status: {
                  isCurrent: data.contributionStatus?.isCurrent || false,
                  missingCount: data.contributionStatus?.missingMonthsCount || 0,
                }
              };
            }
          } catch (error) {
            console.warn(`Failed to load status for member ${member._id}`);
          }
          return null;
        });

        const statusResults = await Promise.all(statusPromises);
        statusResults.forEach(result => {
          if (result) {
            statusMap.set(result.memberId, result.status);
          }
        });
        
        setMemberContributionStatus(statusMap);
      }
    } catch (err) {
      console.error("Error loading members:", err);
      setError("Failed to load members data");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  return {
    members,
    memberContributionStatus,
    loading,
    error,
    loadMembersData
  };
};

// Custom hook for community finances
export const useCommunityFinances = () => {
  const [communityFinances, setCommunityFinances] = useState<CommunityFinances | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadCommunityFinances = useCallback(async () => {
    if (loadingRef.current) return; // Prevent duplicate calls
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const token = getLocalStorage<string>("token");
      const headers = { Authorization: `Bearer ${token}` };

      const result = await apiRequest<CommunityFinances>("/api/community-finances", { headers });
      
      if (result.success && result.data) {
        setCommunityFinances(result.data);
      }
    } catch (err) {
      console.error("Error loading community finances:", err);
      setError("Failed to load financial data");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  return {
    communityFinances,
    loading,
    error,
    loadCommunityFinances
  };
};
