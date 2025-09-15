"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus,
    Edit,
    Trash2,
    Calendar,
    DollarSign,
    TrendingUp,
    Filter,
    Download,
    RefreshCw
} from "lucide-react";
import { IHistoricalInterest, IHistoricalInterestCreate } from "@/types";
import { showToast } from "@/lib/toast";
import { apiRequest, formatDate } from "@/lib/utils";

interface FormData extends IHistoricalInterestCreate {
    _id?: string;
}

interface Member {
    _id: string;
    name: string;
    memberId: string;
    email?: string;
    phone: string;
}

interface FormErrors {
    [key: string]: string;
}

interface FilterState {
    year: string;
    month: string;
    source: string;
    startDate: string;
    endDate: string;
}

interface SummaryData {
    totalHistoricalInterest: number;
    summaryBySource: Array<{
        _id: string;
        totalAmount: number;
        count: number;
    }>;
    recentRecords: IHistoricalInterest[];
    yearlyTotals: Array<{
        year: number;
        totalAmount: number;
        count: number;
    }>;
}

export default function HistoricalInterestManager() {
    const [activeTab, setActiveTab] = useState('overview');
    const [records, setRecords] = useState<IHistoricalInterest[]>([]);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<IHistoricalInterest | null>(null);
    const [pagination, setPagination] = useState({
        current: 1,
        total: 0,
        limit: 20,
        hasNext: false,
        hasPrev: false,
    });

    const [formData, setFormData] = useState<FormData>({
        amount: 0,
        interestDate: new Date(),
        source: 'other' as const,
        description: '',
        userId: '',
        borrowerName: '',
        notes: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [filters, setFilters] = useState<FilterState>({
        year: new Date().getFullYear().toString(),
        month: '',
        source: '',
        startDate: '',
        endDate: '',
    });

    const sourceOptions = [
        { value: 'loan_repayment', label: 'Loan Repayment' },
        { value: 'penalty', label: 'Penalty' },
        { value: 'late_fee', label: 'Late Fee' },
        { value: 'settlement', label: 'Settlement' },
        { value: 'other', label: 'Other' },
    ];

    const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    // Load members list
    const loadMembers = async () => {
        try {
            const result = await apiRequest<Member[]>('/api/users/members-list');
            if (result.success && result.data) {
                setMembers(result.data);
            }
        } catch (error) {
            console.error('Error loading members:', error);
        }
    };

    // Load summary data
    const loadSummaryData = async () => {
        try {
            const result = await apiRequest<SummaryData>('/api/historical-interest/summary');
            if (result.success && result.data) {
                setSummaryData(result.data);
            }
        } catch (error) {
            console.error('Error loading summary data:', error);
        }
    };

    // Load records with filters
    const loadRecords = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
            });

            // Add filters
            if (filters.year) params.append('year', filters.year);
            if (filters.month) params.append('month', filters.month);
            if (filters.source) params.append('source', filters.source);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const result = await apiRequest<{
                records: IHistoricalInterest[];
                pagination: any;
                summary: any;
            }>(`/api/historical-interest?${params.toString()}`);

            if (result.success && result.data) {
                setRecords(result.data.records);
                setPagination(result.data.pagination);
            }
        } catch (error) {
            console.error('Error loading records:', error);
            showToast.error('Failed to load historical interest records');
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount and when filters change
    useEffect(() => {
        loadMembers();
        loadSummaryData();
        loadRecords();
    }, [filters]);

    // Form validation
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.amount || formData.amount <= 0) {
            newErrors.amount = 'Valid amount is required';
        }

        if (!formData.interestDate) {
            newErrors.interestDate = 'Interest date is required';
        } else {
            const interestDate = new Date(formData.interestDate);
            if (interestDate > new Date()) {
                newErrors.interestDate = 'Interest date cannot be in the future';
            }
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        if (!formData.source) {
            newErrors.source = 'Interest source is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const url = editingRecord
                ? `/api/historical-interest/${editingRecord._id}`
                : '/api/historical-interest';

            const method = editingRecord ? 'PUT' : 'POST';

            const result = await apiRequest(url, {
                method,
                body: JSON.stringify({
                    amount: formData.amount,
                    interestDate: formData.interestDate,
                    source: formData.source,
                    description: formData.description.trim(),
                    userId: formData.userId || undefined,
                    borrowerName: formData.borrowerName?.trim() || undefined,
                    notes: formData.notes?.trim() || undefined,
                }),
            });

            if (result.success) {
                showToast.success(
                    editingRecord
                        ? 'Historical interest record updated successfully'
                        : 'Historical interest record created successfully'
                );
                resetForm();
                loadRecords();
                loadSummaryData();
            } else {
                showToast.error(result.error || 'Failed to save record');
            }
        } catch (error) {
            console.error('Error saving record:', error);
            showToast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            amount: 0,
            interestDate: new Date(),
            source: 'other',
            description: '',
            userId: '',
            borrowerName: '',
            notes: '',
        });
        setErrors({});
        setEditingRecord(null);
        setShowAddForm(false);
    };

    // Handle edit
    const handleEdit = (record: IHistoricalInterest) => {
        setFormData({
            _id: record._id.toString(),
            amount: record.amount,
            interestDate: record.interestDate,
            source: record.source,
            description: record.description,
            userId: (record.userId as any)?._id || '',
            borrowerName: record.borrowerName || '',
            notes: record.notes || '',
        });
        setEditingRecord(record);
        setShowAddForm(true);
        setActiveTab('add-record');
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this historical interest record?')) {
            return;
        }

        try {
            const result = await apiRequest(`/api/historical-interest/${id}`, {
                method: 'DELETE',
            });

            if (result.success) {
                showToast.success('Historical interest record deleted successfully');
                loadRecords();
                loadSummaryData();
            } else {
                showToast.error(result.error || 'Failed to delete record');
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            showToast.error('An unexpected error occurred');
        }
    };

    // Handle input changes
    const handleInputChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Handle filter changes
    const handleFilterChange = (field: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            year: new Date().getFullYear().toString(),
            month: '',
            source: '',
            startDate: '',
            endDate: '',
        });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Historical Interest Manager</h1>
                    <p className="text-muted-foreground">
                        Manage and track historical interest collected from past 2 years
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setActiveTab('add-record'); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interest Record
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="records">Records</TabsTrigger>
                    <TabsTrigger value="add-record">
                        {editingRecord ? 'Edit Record' : 'Add Record'}
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {summaryData && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Historical Interest</CardTitle>
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(summaryData.totalHistoricalInterest)}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {summaryData.summaryBySource.reduce((sum, s) => sum + s.count, 0)}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Years Covered</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {summaryData.yearlyTotals.length}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Top Source</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {summaryData.summaryBySource[0]?._id || 'N/A'}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Summary by Source */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Interest by Source</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {summaryData.summaryBySource.map((source) => (
                                            <div key={source._id} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {sourceOptions.find(s => s.value === source._id)?.label || source._id}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        ({source.count} records)
                                                    </span>
                                                </div>
                                                <span className="font-medium">
                                                    {formatCurrency(source.totalAmount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Records */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Records</CardTitle>
                                    <CardDescription>Last 10 historical interest entries</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {summaryData.recentRecords.map((record) => (
                                            <div key={record._id.toString()} className="flex justify-between items-center p-2 border rounded">
                                                <div>
                                                    <div className="font-medium">{record.description}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {formatDate(record.interestDate)} • {sourceOptions.find(s => s.value === record.source)?.label}
                                                    </div>
                                                </div>
                                                <span className="font-medium">{formatCurrency(record.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Records Tab */}
                <TabsContent value="records" className="space-y-6">
                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div>
                                    <Label htmlFor="filter-year">Year</Label>
                                    <Input
                                        id="filter-year"
                                        type="number"
                                        value={filters.year}
                                        onChange={(e) => handleFilterChange('year', e.target.value)}
                                        min="2020"
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="filter-month">Month</Label>
                                    <select
                                        id="filter-month"
                                        value={filters.month}
                                        onChange={(e) => handleFilterChange('month', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    >
                                        <option value="">All Months</option>
                                        {months.map(month => (
                                            <option key={month.value} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="filter-source">Source</Label>
                                    <select
                                        id="filter-source"
                                        value={filters.source}
                                        onChange={(e) => handleFilterChange('source', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    >
                                        <option value="">All Sources</option>
                                        {sourceOptions.map(source => (
                                            <option key={source.value} value={source.value}>
                                                {source.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="filter-start">Start Date</Label>
                                    <Input
                                        id="filter-start"
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="filter-end">End Date</Label>
                                    <Input
                                        id="filter-end"
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button onClick={clearFilters} variant="outline" size="sm">
                                    Clear Filters
                                </Button>
                                <Button onClick={() => loadRecords()} variant="outline" size="sm">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Records Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Historical Interest Records</CardTitle>
                            <CardDescription>
                                {loading ? 'Loading...' : `Showing ${records.length} records`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Member</TableHead>
                                                <TableHead>Recorded By</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.length > 0 ? (
                                                records.map((record) => (
                                                    <TableRow key={record._id.toString()}>
                                                        <TableCell>
                                                            {formatDate(record.interestDate)}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {formatCurrency(record.amount)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {sourceOptions.find(s => s.value === record.source)?.label || record.source}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate">
                                                            {record.description}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                {(record.userId as any)?.name ? (
                                                                    <div>
                                                                        <div className="font-medium">{(record.userId as any).name}</div>
                                                                        <div className="text-xs text-muted-foreground">{(record.userId as any).memberId}</div>
                                                                    </div>
                                                                ) : record.borrowerName ? (
                                                                    <div className="text-gray-600">{record.borrowerName}</div>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {(record.recordedBy as any)?.name || 'Unknown'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleEdit(record)}
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDelete(record._id.toString())}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-6">
                                                        No historical interest records found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Pagination */}
                            {pagination.total > 1 && (
                                <div className="flex justify-between items-center mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Page {pagination.current} of {pagination.total}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!pagination.hasPrev}
                                            onClick={() => loadRecords(pagination.current - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!pagination.hasNext}
                                            onClick={() => loadRecords(pagination.current + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Add/Edit Record Tab */}
                <TabsContent value="add-record">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {editingRecord ? 'Edit Historical Interest Record' : 'Add Historical Interest Record'}
                            </CardTitle>
                            <CardDescription>
                                {editingRecord ? 'Update the historical interest record details' : 'Add a new historical interest record for past collections'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="amount">Amount (NPR) *</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            value={formData.amount || ''}
                                            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                                            className={errors.amount ? 'border-red-300' : ''}
                                            min="0"
                                            step="0.01"
                                        />
                                        {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="interestDate">Interest Date *</Label>
                                        <Input
                                            id="interestDate"
                                            type="date"
                                            value={formData.interestDate ? new Date(formData.interestDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleInputChange('interestDate', new Date(e.target.value))}
                                            className={errors.interestDate ? 'border-red-300' : ''}
                                        />
                                        {errors.interestDate && <p className="text-sm text-red-600 mt-1">{errors.interestDate}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="source">Interest Source *</Label>
                                        <select
                                            id="source"
                                            value={formData.source}
                                            onChange={(e) => handleInputChange('source', e.target.value)}
                                            className={`w-full p-2 border rounded ${errors.source ? 'border-red-300' : ''}`}
                                        >
                                            {sourceOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.source && <p className="text-sm text-red-600 mt-1">{errors.source}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="userId">Member</Label>
                                        <select
                                            id="userId"
                                            value={formData.userId}
                                            onChange={(e) => handleInputChange('userId', e.target.value)}
                                            className="w-full p-2 border rounded"
                                        >
                                            <option value="">Select member (optional)</option>
                                            {members.map(member => (
                                                <option key={member._id} value={member._id}>
                                                    {member.name} ({member.memberId})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor="borrowerName">Legacy Borrower Name</Label>
                                        <Input
                                            id="borrowerName"
                                            value={formData.borrowerName}
                                            onChange={(e) => handleInputChange('borrowerName', e.target.value)}
                                            placeholder="Only for legacy records without member selection"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Use member selection above instead of this field for new records
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="description">Description *</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        className={errors.description ? 'border-red-300' : ''}
                                        placeholder="Brief description of the interest collection"
                                    />
                                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        placeholder="Optional: Additional notes or details"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Saving...' : (editingRecord ? 'Update Record' : 'Add Record')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
