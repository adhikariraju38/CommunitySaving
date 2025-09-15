"use client";

import { useEffect, useState } from "react";
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
import { RefreshCw, UserPlus, Users, Edit, Mail, ShieldOff, Settings } from "lucide-react";
import BulkMemberForm from "@/components/admin/BulkMemberForm";
import EditMemberForm from "@/components/admin/EditMemberForm";
import UserApproval from "@/components/admin/UserApproval";
import { IUser } from "@/types";
import { showToast } from "@/lib/toast";
import { apiRequest } from "@/lib/utils";

interface MembersTabProps {
  onNavigateToHistorical: () => void;
}

type ViewMode = 'list' | 'bulk-add' | 'individual-add' | 'edit';

export default function MembersTab({
  onNavigateToHistorical,
}: MembersTabProps) {
  const { members, memberContributionStatus, loading, error, loadMembersData } =
    useMembersData();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingMember, setEditingMember] = useState<IUser | null>(null);
  const [isFixingIndexes, setIsFixingIndexes] = useState(false);

  // Load data when component mounts
  useEffect(() => {
    loadMembersData();
  }, [loadMembersData]);

  const handleMemberAdded = () => {
    loadMembersData();
    setViewMode('list');
  };

  const handleEditMember = (member: IUser) => {
    setEditingMember(member);
    setViewMode('edit');
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setViewMode('list');
  };

  const handleFixIndexes = async () => {
    setIsFixingIndexes(true);
    try {
      const result = await apiRequest('/api/admin/fix-indexes', {
        method: 'POST'
      });

      if (result.success) {
        showToast.success('Database indexes fixed successfully!', 'You can now create bulk members without errors.');
      } else {
        showToast.error('Failed to fix indexes', result.error);
      }
    } catch (error) {
      showToast.error('An unexpected error occurred while fixing indexes');
    } finally {
      setIsFixingIndexes(false);
    }
  };

  // Show different views based on mode
  if (viewMode === 'bulk-add') {
    return (
      <div className="animate-fade-in">
        <BulkMemberForm
          onSuccess={handleMemberAdded}
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  if (viewMode === 'individual-add') {
    return (
      <div className="animate-fade-in">
        <UserApproval onMemberAdded={handleMemberAdded} />
      </div>
    );
  }

  if (viewMode === 'edit' && editingMember) {
    return (
      <div className="animate-fade-in">
        <EditMemberForm
          member={editingMember}
          onSuccess={handleMemberAdded}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

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
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Members Management</h2>
          <p className="text-muted-foreground">
            View and manage community members
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setViewMode('bulk-add')}
            variant="outline"
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Add
          </Button>
          <Button
            onClick={() => setViewMode('individual-add')}
            variant="outline"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
          <Button
            onClick={handleFixIndexes}
            disabled={isFixingIndexes}
            variant="outline"
            size="sm"
            title="Fix database issues for bulk member creation"
          >
            <Settings className={`h-4 w-4 mr-2 ${isFixingIndexes ? "animate-spin" : ""}`} />
            Fix DB
          </Button>
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
                  <TableHead className="min-w-[200px]">Contact</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">
                    Join Date
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    Account Status
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    Login Access
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    Contribution Status
                  </TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
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
                      <TableCell className="max-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs truncate">{member.phone}</span>
                          </div>
                          {member.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-600 truncate">{member.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No email</span>
                          )}
                        </div>
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
                        <div className="flex items-center gap-1">
                          {member.hasLoginAccess ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Mail className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600">
                              <ShieldOff className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          )}
                        </div>
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
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs whitespace-nowrap"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
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
                    <TableCell colSpan={8} className="text-center py-6">
                      <div className="text-muted-foreground">
                        <p>No members found</p>
                        <p className="text-sm mt-1">
                          Use the &quot;Add Member&quot; or &quot;Bulk Add&quot; buttons to add members
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
