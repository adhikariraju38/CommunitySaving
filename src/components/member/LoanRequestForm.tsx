"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/utils";

interface LoanRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LoanRequestForm({
  onSuccess,
  onCancel,
}: LoanRequestFormProps) {
  const [formData, setFormData] = useState({
    requestedAmount: "",
    purpose: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await apiRequest("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          requestedAmount: parseFloat(formData.requestedAmount),
          purpose: formData.purpose,
        }),
      });

      if (result.success) {
        setFormData({ requestedAmount: "", purpose: "" });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrors({
          submit:
            result.error || result.message || "Failed to submit loan request",
        });
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Request a Loan</CardTitle>
        <CardDescription>
          Submit your loan request for admin approval. Interest rate is 16% per
          annum.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requestedAmount">Amount Requested ($)</Label>
            <Input
              id="requestedAmount"
              name="requestedAmount"
              type="number"
              step="0.01"
              min="1"
              value={formData.requestedAmount}
              onChange={handleInputChange}
              placeholder="Enter amount"
              required
              className={errors.requestedAmount ? "border-red-500" : ""}
            />
            {errors.requestedAmount && (
              <p className="text-sm text-red-500">{errors.requestedAmount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Loan</Label>
            <Textarea
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="Describe the purpose of this loan..."
              rows={3}
              required
              className={errors.purpose ? "border-red-500" : ""}
            />
            {errors.purpose && (
              <p className="text-sm text-red-500">{errors.purpose}</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-between space-x-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
