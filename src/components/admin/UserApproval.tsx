"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/utils";
import { UserListSkeleton } from "@/components/ui/loading-skeletons";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  memberId: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  isActive: boolean;
  joinDate: string;
  lastLogin?: string;
}

interface AddMemberFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface Props {
  onMemberAdded?: () => void;
}

export default function UserApproval({ onMemberAdded }: Props) {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMemberData, setAddMemberData] = useState<AddMemberFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [addMemberErrors, setAddMemberErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ data: User[] }>(
        "/api/users?status=pending"
      );
      if (result.success && result.data && result.data.data) {
        setPendingUsers(result.data.data);
      }
    } catch (error) {
      console.error("Error loading pending users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserDecision = async (
    userId: string,
    decision: "approve" | "reject"
  ) => {
    setProcessingId(userId);

    try {
      if (decision === "approve") {
        const result = await apiRequest(`/api/users/${userId}/approve`, {
          method: "PATCH",
        });

        if (result.success) {
          setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
          toast.success("User approved successfully!");
        } else {
          toast.error(
            "Failed to approve user: " + (result.error || result.message)
          );
        }
      } else {
        // Reject and delete user
        const result = await apiRequest(`/api/users/${userId}`, {
          method: "DELETE",
        });

        if (result.success) {
          setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
          toast.success("User rejected and removed successfully!");
        } else {
          toast.error(
            "Failed to reject user: " + (result.error || result.message)
          );
        }
      }
    } catch (error) {
      toast.error("An error occurred while processing the user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddMemberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddMemberData((prev) => ({ ...prev, [name]: value }));
    if (addMemberErrors[name]) {
      setAddMemberErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateAddMemberForm = () => {
    const errors: Record<string, string> = {};

    if (!addMemberData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!addMemberData.email.trim()) {
      errors.email = "Email is required";
    } else if (
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(addMemberData.email)
    ) {
      errors.email = "Please provide a valid email";
    }

    if (!addMemberData.phone.trim()) {
      errors.phone = "Phone number is required";
    }

    if (!addMemberData.password) {
      errors.password = "Password is required";
    } else if (addMemberData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (addMemberData.password !== addMemberData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateAddMemberForm();
    if (Object.keys(errors).length > 0) {
      setAddMemberErrors(errors);
      return;
    }

    setIsSubmittingMember(true);

    try {
      const result = await apiRequest("/api/users/create-member", {
        method: "POST",
        body: JSON.stringify({
          name: addMemberData.name,
          email: addMemberData.email,
          phone: addMemberData.phone,
          password: addMemberData.password,
        }),
      });

      if (result.success) {
        setAddMemberData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
        });
        setShowAddForm(false);
        toast.success("Member added successfully!");
        // Refresh dashboard data
        if (onMemberAdded) {
          onMemberAdded();
        }
      } else {
        setAddMemberErrors({
          submit: result.error || result.message || "Failed to add member",
        });
      }
    } catch (error) {
      setAddMemberErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return <UserListSkeleton />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">User Management</h2>
          <Button onClick={() => setShowAddForm(true)}>Add New Member</Button>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Approvals ({pendingUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingUsers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-muted-foreground">
                    <p>No pending user approvals</p>
                    <p className="text-sm mt-1">
                      New user registrations will appear here for approval
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <Card key={user._id} className="w-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{user.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {user.email} • Joined {formatDate(user.joinDate)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="font-medium">Member ID</Label>
                          <p>{user.memberId}</p>
                        </div>
                        <div>
                          <Label className="font-medium">Phone</Label>
                          <p>{user.phone}</p>
                        </div>
                        <div>
                          <Label className="font-medium">Role</Label>
                          <p className="capitalize">{user.role}</p>
                        </div>
                        <div>
                          <Label className="font-medium">Status</Label>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleUserDecision(user._id, "reject")}
                          disabled={processingId === user._id}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {processingId === user._id
                            ? "Processing..."
                            : "Reject & Delete"}
                        </Button>
                        <Button
                          onClick={() =>
                            handleUserDecision(user._id, "approve")
                          }
                          disabled={processingId === user._id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === user._id
                            ? "Processing..."
                            : "Approve"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Member Modal */}
      </div>
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Add New Member</CardTitle>
                <CardDescription>
                  Create a new approved member account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={addMemberData.name}
                      onChange={handleAddMemberChange}
                      placeholder="Enter full name"
                      required
                      className={addMemberErrors.name ? "border-red-500" : ""}
                    />
                    {addMemberErrors.name && (
                      <p className="text-sm text-red-500">
                        {addMemberErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={addMemberData.email}
                      onChange={handleAddMemberChange}
                      placeholder="Enter email address"
                      required
                      className={addMemberErrors.email ? "border-red-500" : ""}
                    />
                    {addMemberErrors.email && (
                      <p className="text-sm text-red-500">
                        {addMemberErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={addMemberData.phone}
                      onChange={handleAddMemberChange}
                      placeholder="Enter phone number"
                      required
                      className={addMemberErrors.phone ? "border-red-500" : ""}
                    />
                    {addMemberErrors.phone && (
                      <p className="text-sm text-red-500">
                        {addMemberErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={addMemberData.password}
                      onChange={handleAddMemberChange}
                      placeholder="Enter password"
                      required
                      className={
                        addMemberErrors.password ? "border-red-500" : ""
                      }
                    />
                    {addMemberErrors.password && (
                      <p className="text-sm text-red-500">
                        {addMemberErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={addMemberData.confirmPassword}
                      onChange={handleAddMemberChange}
                      placeholder="Confirm password"
                      required
                      className={
                        addMemberErrors.confirmPassword ? "border-red-500" : ""
                      }
                    />
                    {addMemberErrors.confirmPassword && (
                      <p className="text-sm text-red-500">
                        {addMemberErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {addMemberErrors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">
                        {addMemberErrors.submit}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setAddMemberData({
                          name: "",
                          email: "",
                          phone: "",
                          password: "",
                          confirmPassword: "",
                        });
                        setAddMemberErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingMember}>
                      {isSubmittingMember ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
