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
  validatePhone,
  setLocalStorage,
  getLocalStorage,
} from "@/lib/utils";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (validateEmail(formData.email)) {
      newErrors.email = validateEmail(formData.email)!;
    }

    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (validatePhone(formData.phone)) {
      newErrors.phone = validatePhone(formData.phone)!;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else {
      // Check for at least one letter and one number
      const hasLetter = /[a-zA-Z]/.test(formData.password);
      const hasNumber = /\d/.test(formData.password);

      if (!hasLetter || !hasNumber) {
        newErrors.password =
          "Password must contain at least one letter and one number";
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/register", {
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
        // Store user data and token
        setLocalStorage("user", result.data.user);
        setLocalStorage("token", result.data.token);

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setErrors({
          submit: result.error || result.message || "Registration failed",
        });
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
            Join our community savings and loan platform
          </p>
        </div>

        <Card className="w-full animate-scale-in">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-center">
              Create Account
            </CardTitle>
            <CardDescription className="text-center">
              Register to join the community savings group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
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
                  placeholder="Create a password"
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters with letters and
                  numbers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword}
                  </p>
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
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign in here
                </Link>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              By creating an account, you agree to participate in the community
              savings group with a monthly contribution of $2000.
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
