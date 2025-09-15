"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  apiRequest,
  validateEmail,
  setLocalStorage,
  getLocalStorage,
} from "@/lib/utils";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const token = getLocalStorage<string>("token");
    const user = getLocalStorage<any>("user");

    if (token && user) {
      // User is already logged in, redirect to dashboard
      router.push("/dashboard");
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (validateEmail(formData.email)) {
      newErrors.email = validateEmail(formData.email)!;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (
        result.success &&
        result.data &&
        typeof result.data === "object" &&
        result.data !== null &&
        "user" in result.data &&
        "token" in result.data
      ) {
        console.log("✅ Login: Success! Storing user data and token");
        console.log(
          "👤 Login: User:",
          (result.data.user as any).email,
          "Role:",
          (result.data.user as any).role
        );

        // Store user data and token
        setLocalStorage("user", result.data.user);
        setLocalStorage("token", result.data.token);

        console.log("🚀 Login: Redirecting to dashboard");
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setErrors({ submit: result.error || result.message || "Login failed" });
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 mobile-container py-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center animate-slide-up">
          <h1 className="mobile-heading">Community Savings</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Digital platform for community savings and loans
          </p>
        </div>

        <Card className="w-full animate-scale-in">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-center">
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errors.submit}
                </div>
              )}

              <Button
                type="submit"
                className="w-full smooth-button"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign up here
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>Community Savings & Loan Management System</p>
        </div>
      </div>
    </div>
  );
}
