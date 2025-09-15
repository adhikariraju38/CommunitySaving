"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useMembersData } from "@/hooks/useAdminData";
import { RefreshCw } from "lucide-react";

interface MembersTabProps {
  onNavigateToHistorical: () => void;
}

export default function MembersTab({
  onNavigateToHistorical,
}: MembersTabProps) {
  const { members, memberContributionStatus, loading, error, loadMembersData } =
    useMembersData();

  // Load data when component mounts
  useEffect(() => {
    loadMembersData();
  }, [loadMembersData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-600 mb-2">{error}</p>
        <Button onClick={loadMembersData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Members Management</h2>
          <p className="text-muted-foreground">
            View and manage community members
          </p>
        </div>
        <Button
          onClick={loadMembersData}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All Members</CardTitle>
            <CardDescription>
              Complete list of community members and their status
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mobile-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Name</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[120px]">
                    Member ID
                  </TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">
                    Join Date
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    Account Status
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    Contribution Status
                  </TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members && members.length > 0 ? (
                  members.map((member) => (
                    <TableRow key={member._id.toString()}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground sm:hidden">
                            {member.memberId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {member.memberId}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {member.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {formatDate(member.joinDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            member.isActive
                              ? "contribution-status-paid"
                              : "contribution-status-pending"
                          }
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {memberContributionStatus.has(member._id.toString()) ? (
                          <div className="space-y-1">
                            <Badge
                              className={
                                memberContributionStatus.get(
                                  member._id.toString()
                                )?.isCurrent
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {memberContributionStatus.get(
                                member._id.toString()
                              )?.isCurrent
                                ? "Current"
                                : "Behind"}
                            </Badge>
                            {!memberContributionStatus.get(
                              member._id.toString()
                            )?.isCurrent && (
                              <div className="text-xs text-muted-foreground">
                                Missing:{" "}
                                {
                                  memberContributionStatus.get(
                                    member._id.toString()
                                  )?.missingCount
                                }{" "}
                                months
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">
                            Loading...
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs whitespace-nowrap"
                            onClick={onNavigateToHistorical}
                          >
                            Contributions
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      <div className="text-muted-foreground">
                        <p>No members found</p>
                        <p className="text-sm mt-1">
                          Members will appear here once they are registered
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
    </div>
  );
}
