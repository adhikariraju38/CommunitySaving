"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { X, Plus, Upload, Download } from "lucide-react";
import { IBulkMemberData } from "@/types";
import { showToast } from "@/lib/toast";
import { apiRequest } from "@/lib/utils";

interface BulkMemberFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

interface MemberRow extends IBulkMemberData {
    id: string;
    error?: string;
}

export default function BulkMemberForm({ onSuccess, onCancel }: BulkMemberFormProps) {
    const [members, setMembers] = useState<MemberRow[]>([
        { id: '1', name: '', phone: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [showTextInput, setShowTextInput] = useState(false);

    const addMemberRow = () => {
        const newId = String(members.length + 1);
        setMembers([...members, { id: newId, name: '', phone: '' }]);
    };

    const removeMemberRow = (id: string) => {
        if (members.length > 1) {
            setMembers(members.filter(member => member.id !== id));
        }
    };

    const updateMember = (id: string, field: keyof IBulkMemberData, value: string) => {
        setMembers(members.map(member =>
            member.id === id
                ? { ...member, [field]: value, error: undefined }
                : member
        ));
    };

    const validateMembers = (): boolean => {
        let isValid = true;
        const phoneNumbers = new Set<string>();

        const validatedMembers = members.map(member => {
            const errors: string[] = [];

            if (!member.name.trim()) {
                errors.push('Name is required');
            }

            // Phone is now optional, but if provided, it must be valid
            if (member.phone && member.phone.trim()) {
                // Basic phone validation
                const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/;
                if (!phoneRegex.test(member.phone.trim())) {
                    errors.push('Invalid phone format');
                } else if (phoneNumbers.has(member.phone.trim())) {
                    errors.push('Duplicate phone number');
                } else {
                    phoneNumbers.add(member.phone.trim());
                }
            }

            if (errors.length > 0) {
                isValid = false;
                return { ...member, error: errors.join(', ') };
            }

            return { ...member, error: undefined };
        });

        setMembers(validatedMembers);
        return isValid;
    };

    const parseTextInput = () => {
        const lines = textInput.split('\n').filter(line => line.trim());
        const parsedMembers: MemberRow[] = [];

        lines.forEach((line, index) => {
            const parts = line.split(',').map(part => part.trim());
            if (parts.length >= 1 && parts[0]) { // At least name is required
                parsedMembers.push({
                    id: String(index + 1),
                    name: parts[0],
                    phone: parts.length >= 2 ? parts[1] : '' // Phone is optional
                });
            }
        });

        if (parsedMembers.length > 0) {
            setMembers(parsedMembers);
            setTextInput('');
            setShowTextInput(false);
            showToast.success(`Parsed ${parsedMembers.length} members from text`);
        } else {
            showToast.error('No valid members found in the text. Use format: Name, Phone (one per line). Phone is optional.');
        }
    };

    const downloadTemplate = () => {
        const csvContent = "Name,Phone\nJohn Doe,+1234567890\nJane Smith,\nBob Wilson,+1234567892";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk_members_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        if (!validateMembers()) {
            showToast.error('Please fix the validation errors before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            const validMembers = members
                .filter(member => member.name.trim()) // Only name is required now
                .map(member => {
                    const memberData: any = {
                        name: member.name.trim()
                    };

                    // Only include phone if it's provided and not empty
                    if (member.phone && member.phone.trim()) {
                        memberData.phone = member.phone.trim();
                    }

                    return memberData;
                });

            const response = await fetch('/api/users/bulk-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ members: validMembers }),
            });

            const result = await response.json();

            if (result.success) {
                showToast.success(result.message || 'Members created successfully');
                onSuccess();
            } else {
                if (result.details && Array.isArray(result.details)) {
                    showToast.error(`${result.error}: ${result.details.join(', ')}`);
                } else {
                    showToast.error(result.error || 'Failed to create members');
                }
            }
        } catch (error) {
            console.error('Error creating bulk members:', error);
            showToast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const validMemberCount = members.filter(m => m.name.trim() && !m.error).length;

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Bulk Add Members</CardTitle>
                        <CardDescription>
                            Add multiple members without email/password. Phone numbers are optional. They can be given login access later.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMemberRow}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTextInput(!showTextInput)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Import
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadTemplate}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                    </Button>
                </div>

                {/* Text Input for Bulk Import */}
                {showTextInput && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Bulk Import from Text</CardTitle>
                            <CardDescription>
                                Paste member data in CSV format: Name, Phone (one member per line). Phone is optional - leave empty if not available.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="John Doe, +1234567890&#10;Jane Smith, &#10;Bob Wilson, +1234567892&#10;..."
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                rows={6}
                            />
                            <div className="flex gap-2">
                                <Button onClick={parseTextInput} disabled={!textInput.trim()}>
                                    Parse & Import
                                </Button>
                                <Button variant="outline" onClick={() => setShowTextInput(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Members Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Name *</TableHead>
                                <TableHead className="w-[40%]">Phone (Optional)</TableHead>
                                <TableHead className="w-[20%]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((member) => (
                                <TableRow key={member.id} className={member.error ? 'bg-red-50' : ''}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Input
                                                placeholder="Enter full name"
                                                value={member.name}
                                                onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                                                className={member.error ? 'border-red-300' : ''}
                                            />
                                            {member.error && member.error.includes('Name') && (
                                                <p className="text-xs text-red-600">Name is required</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Input
                                                placeholder="Enter phone number (optional)"
                                                value={member.phone || ''}
                                                onChange={(e) => updateMember(member.id, 'phone', e.target.value)}
                                                className={member.error ? 'border-red-300' : ''}
                                            />
                                            {member.error && member.error.includes('phone') && (
                                                <p className="text-xs text-red-600">Invalid phone format</p>
                                            )}
                                            {member.error && member.error.includes('Duplicate') && (
                                                <p className="text-xs text-red-600">Duplicate phone number</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeMemberRow(member.id)}
                                            disabled={members.length <= 1}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Summary */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <Badge variant="outline">
                            Total: {members.length}
                        </Badge>
                        <Badge variant={validMemberCount > 0 ? "default" : "secondary"}>
                            Valid: {validMemberCount}
                        </Badge>
                        {members.some(m => m.error) && (
                            <Badge variant="destructive">
                                Errors: {members.filter(m => m.error).length}
                            </Badge>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || validMemberCount === 0}
                        >
                            {isSubmitting ? 'Creating...' : `Create ${validMemberCount} Members`}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
