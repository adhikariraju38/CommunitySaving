"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanManagement from "./LoanManagement";
import ContributionTracking from "./ContributionTracking";
import UserApproval from "./UserApproval";
import ReportGeneration from "./ReportGeneration";
import HistoricalContributions from "./HistoricalContributions";
import HistoricalInterestManager from "./HistoricalInterestManager";
import NewMemberCalculator from "./NewMemberCalculator";
import OverviewTab from "./tabs/OverviewTab";
import MembersTab from "./tabs/MembersTab";
import CommunityFinancesTab from "./tabs/CommunityFinancesTab";

interface Props {
  user: {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "member";
    memberId: string;
    phone: string;
    isActive: boolean;
    joinDate: string;
  };
}

export default function AdminDashboard({ user }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Initialize tab from URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      [
        "overview",
        "loans",
        "contributions",
        "members",
        "approval",
        // "reports", // Commented out as requested
        "finances",
        "historical",
        "historical-interest",
        "calculator",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab change with URL update
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`?${params.toString()}`);
  };

  const handleNavigateToHistorical = () => {
    handleTabChange("historical");
  };

  // Common tab trigger classes
  const tabTriggerClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-shrink-0";

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p className="admin-subtitle">
          Welcome back, <span className="font-medium">{user.name}</span>
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="w-full overflow-x-auto tab-scroll-container px-1">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max gap-1">
            <TabsTrigger value="overview" className={tabTriggerClasses}>
              <span className="sm:hidden">Overview</span>
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="loans" className={tabTriggerClasses}>
              <span className="sm:hidden">Loans</span>
              <span className="hidden sm:inline">Loan Management</span>
            </TabsTrigger>
            <TabsTrigger value="contributions" className={tabTriggerClasses}>
              <span className="sm:hidden">Contributions</span>
              <span className="hidden sm:inline">Contributions</span>
            </TabsTrigger>
            <TabsTrigger value="members" className={tabTriggerClasses}>
              Members
            </TabsTrigger>
            <TabsTrigger value="approval" className={tabTriggerClasses}>
              <span className="sm:hidden">Approval</span>
              <span className="hidden sm:inline">User Approval</span>
            </TabsTrigger>
            {/* <TabsTrigger value="reports" className={tabTriggerClasses}>
              Reports
            </TabsTrigger> */}
            <TabsTrigger value="calculator" className={tabTriggerClasses}>
              <span className="sm:hidden">Calculator</span>
              <span className="hidden sm:inline">New Member Calculator</span>
            </TabsTrigger>
            <TabsTrigger value="finances" className={tabTriggerClasses}>
              <span className="sm:hidden">Finances</span>
              <span className="hidden sm:inline">Community Finances</span>
            </TabsTrigger>
            <TabsTrigger value="historical" className={tabTriggerClasses}>
              <span className="sm:hidden">Historical</span>
              <span className="hidden sm:inline">Historical Contributions</span>
            </TabsTrigger>
            <TabsTrigger value="historical-interest" className={tabTriggerClasses}>
              <span className="sm:hidden">Interest</span>
              <span className="hidden sm:inline">Historical Interest</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        {/* Loan Management Tab */}
        <TabsContent value="loans" className="animate-fade-in">
          <LoanManagement user={user} />
        </TabsContent>

        {/* Contributions Tab */}
        <TabsContent value="contributions" className="animate-fade-in">
          <ContributionTracking user={user} />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <MembersTab onNavigateToHistorical={handleNavigateToHistorical} />
        </TabsContent>

        {/* User Approval Tab */}
        <TabsContent value="approval" className="animate-fade-in">
          <UserApproval />
        </TabsContent>

        {/* Reports Tab - Commented out as requested */}
        {/* <TabsContent value="reports" className="animate-fade-in">
          <ReportGeneration />
        </TabsContent> */}

        {/* New Member Calculator Tab */}
        <TabsContent value="calculator" className="animate-fade-in">
          <NewMemberCalculator />
        </TabsContent>

        {/* Community Finances Tab */}
        <TabsContent value="finances">
          <CommunityFinancesTab />
        </TabsContent>

        {/* Historical Contributions Tab */}
        <TabsContent value="historical" className="animate-fade-in">
          <HistoricalContributions />
        </TabsContent>

        {/* Historical Interest Tab */}
        <TabsContent value="historical-interest" className="animate-fade-in">
          <HistoricalInterestManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
