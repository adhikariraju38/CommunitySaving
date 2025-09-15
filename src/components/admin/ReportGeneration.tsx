"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/utils";
import { Download, FileText, Calendar, Users, DollarSign } from "lucide-react";

interface ReportFilters {
  type: "users" | "contributions" | "loans" | "financial-summary";
  format: "csv" | "json";
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  userId?: string;
}

export default function ReportGeneration() {
  const [filters, setFilters] = useState<ReportFilters>({
    type: "users",
    format: "csv",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const generateReport = async () => {
    setIsGenerating(true);

    try {
      // Build query string
      const queryParams = new URLSearchParams({
        type: filters.type,
        format: filters.format,
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.status && { status: filters.status }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports?${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");

      if (filters.format === "csv") {
        // Handle CSV download
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filters.type}_report_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setLastReport({
          type: filters.type,
          format: filters.format,
          generatedAt: new Date().toISOString(),
          filename: link.download,
        });

        toast.success(
          `${
            filters.type.charAt(0).toUpperCase() + filters.type.slice(1)
          } report downloaded successfully as CSV!`
        );
      } else {
        // Handle JSON download
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filters.type}_report_${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setLastReport({
          type: filters.type,
          format: filters.format,
          generatedAt: new Date().toISOString(),
          filename: link.download,
        });

        toast.success(
          `${
            filters.type.charAt(0).toUpperCase() + filters.type.slice(1)
          } report downloaded successfully as JSON!`
        );
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate report. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case "users":
        return <Users className="w-5 h-5" />;
      case "contributions":
        return <DollarSign className="w-5 h-5" />;
      case "loans":
        return <FileText className="w-5 h-5" />;
      case "financial-summary":
        return <Calendar className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const reportTypes = [
    {
      value: "users",
      label: "Users Report",
      description: "List of all users with their details and status",
    },
    {
      value: "contributions",
      label: "Contributions Report",
      description: "Monthly contribution records and payment status",
    },
    {
      value: "loans",
      label: "Loans Report",
      description: "Loan applications, approvals, and repayment status",
    },
    {
      value: "financial-summary",
      label: "Financial Summary",
      description: "Overall financial health and statistics",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Report Generation</h2>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>
            Configure and generate various reports for your community savings
            group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        {getReportIcon(type.value)}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {reportTypes.find((t) => t.value === filters.type)?.description}
              </p>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label htmlFor="format">Format</Label>
              <Select
                value={filters.format}
                onValueChange={(value) => handleFilterChange("format", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                  <SelectItem value="json">
                    JSON (Developer Friendly)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Filters */}
          {(filters.type === "contributions" ||
            filters.type === "loans" ||
            filters.type === "financial-summary") && (
            <div className="space-y-3">
              <Label>Date Range (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFrom" className="text-sm">
                    From Date
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo" className="text-sm">
                    To Date
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Filter for specific reports */}
          {filters.type === "loans" && (
            <div className="space-y-3">
              <Label htmlFor="status">Loan Status (Optional)</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {filters.type === "contributions" && (
            <div className="space-y-3">
              <Label htmlFor="contributionStatus">
                Payment Status (Optional)
              </Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {filters.type === "users" && (
            <div className="space-y-3">
              <Label htmlFor="userStatus">User Status (Optional)</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full md:w-auto"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Report Info */}
      {lastReport && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Report Generated Successfully</p>
                  <p className="text-sm text-muted-foreground">
                    {lastReport.filename} -{" "}
                    {new Date(lastReport.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Downloaded</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Types Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((type) => (
          <Card key={type.value} className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getReportIcon(type.value)}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{type.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
