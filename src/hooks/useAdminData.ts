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

// Custom hook for members data with pagination
export const useMembersData = () => {
  const [members, setMembers] = useState<IUser[]>([]);
  const [memberContributionStatus, setMemberContributionStatus] = useState<
    Map<string, { isCurrent: boolean; missingCount: number }>
  >(new Map());
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
    limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadMembersData = useCallback(async (page: number = 1, limit: number = 10) => {
    if (loadingRef.current) return; // Prevent duplicate calls

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = getLocalStorage<string>("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Add pagination parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'joinDate',
        sortOrder: 'desc'
      });

      const result = await apiRequest<PaginatedResponse<IUser>>(`/api/users?${params.toString()}`, { headers });

      let membersData: IUser[] = [];
      if (result.success && result.data) {
        if (Array.isArray(result.data.data)) {
          membersData = result.data.data;
          // Update pagination state
          if (result.data.pagination) {
            setPagination({
              current: result.data.pagination.current,
              total: result.data.pagination.total,
              pages: result.data.pagination.pages,
              hasNext: result.data.pagination.hasNext,
              hasPrev: result.data.pagination.hasPrev,
              limit: limit
            });
          }
        } else if (Array.isArray(result.data)) {
          membersData = result.data;
          // If we get a direct array, set pagination for all data on one page
          setPagination({
            current: 1,
            total: membersData.length,
            pages: 1,
            hasNext: false,
            hasPrev: false,
            limit: membersData.length
          });
        }
        setMembers(membersData);

        // Load contribution status for current page members
        const statusMap = new Map();

        const statusPromises = membersData.map(async (member) => {
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

  const goToPage = useCallback((page: number) => {
    loadMembersData(page, pagination.limit);
  }, [loadMembersData, pagination.limit]);

  const changePageSize = useCallback((newLimit: number) => {
    loadMembersData(1, newLimit);
  }, [loadMembersData]);

  return {
    members,
    memberContributionStatus,
    pagination,
    loading,
    error,
    loadMembersData,
    goToPage,
    changePageSize
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
