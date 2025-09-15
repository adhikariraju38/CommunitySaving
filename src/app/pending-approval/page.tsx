"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLocalStorage, removeLocalStorage } from "@/lib/utils";

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

export default function PendingApprovalPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = getLocalStorage<User>("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    setUser(userData);

    // If user is already approved, redirect to dashboard
    if (userData.status === "approved") {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogout = () => {
    removeLocalStorage("token");
    removeLocalStorage("user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center mobile-container py-8">
      <Card className="w-full max-w-2xl animate-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your account registration has been received and is awaiting
            administrator approval.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-yellow-600 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-yellow-800">
                  What happens next?
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  An administrator will review your registration and approve
                  your account. You&apos;ll be notified once your account is
                  activated.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Member ID</p>
                <p className="font-medium">{user.memberId}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {user.status}
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">Registration Date</p>
                <p className="font-medium">
                  {new Date(user.joinDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Need help?</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  • If you have questions about your registration, please
                  contact your group administrator.
                </p>
                <p>• Make sure all your registration details are correct.</p>
                <p>• Approval typically takes 1-2 business days.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full md:w-auto"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
