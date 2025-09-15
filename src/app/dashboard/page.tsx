"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocalStorage, apiRequest } from "@/lib/utils";
import AdminDashboard from "@/components/admin/AdminDashboard";
import MemberDashboard from "@/components/member/MemberDashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoadingSkeleton } from "@/components/ui/loading-skeletons";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  memberId: string;
  phone: string;
  isActive: boolean;
  joinDate: string;
  lastLogin?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log("🔄 Dashboard: Starting authentication check...");

        // First, try to get user from localStorage
        const storedUser = getLocalStorage<User>("user");
        const token = getLocalStorage<string>("token");

        console.log(
          "📝 Dashboard: Stored user:",
          storedUser?.email,
          "Role:",
          storedUser?.role
        );
        console.log("🔑 Dashboard: Token exists:", !!token);

        if (!token) {
          console.log("❌ Dashboard: No token found, redirecting to login");
          router.push("/login");
          return;
        }

        if (storedUser) {
          setUser(storedUser);
          setLoading(false);
          console.log("✅ Dashboard: Using stored user data");
        }

        console.log("🌐 Dashboard: Calling /api/auth/me to verify token...");
        // Verify token and get fresh user data
        const result = await apiRequest<{ user: User }>("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (result.success && result.data) {
          const freshUser = result.data.user;
          setUser(freshUser);
          // Update localStorage with fresh data
          localStorage.setItem("user", JSON.stringify(freshUser));
          console.log(
            "User loaded successfully:",
            freshUser.email,
            "Role:",
            freshUser.role
          );
        } else {
          console.error("Failed to load user data:", result);
        }

        // Check for errors that would cause redirect to login
        if (!result.success || !result.data) {
          console.log("❌ Dashboard: API call failed, result:", result);
          console.log(
            "❌ Dashboard: Clearing storage and redirecting to login"
          );
          // Token is invalid, redirect to login
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("💥 Dashboard: Error loading user data:", error);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      router.push("/login");
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center mb-4">
              {error}
            </CardDescription>
            <div className="flex space-x-2 justify-center">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Header component for both dashboards
  const DashboardHeader = () => (
    <header className="bg-white shadow-sm border-b animate-slide-in">
      <div className="mobile-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
          <div className="flex items-center">
            <h1 className="mobile-heading">Community Savings</h1>
            <span className="ml-3 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-medium">{user.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="smooth-button self-start"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="mobile-container py-4 sm:py-6">
        {user.role === "admin" ? (
          <AdminDashboard user={user} />
        ) : (
          <MemberDashboard user={user} />
        )}
      </main>
    </div>
  );
}
