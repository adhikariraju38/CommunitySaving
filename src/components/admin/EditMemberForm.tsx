"use client";

import React, { useState, useEffect } from "react";
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
import { X, Eye, EyeOff } from "lucide-react";
import { IUser, IMemberEdit } from "@/types";
import { showToast } from "@/lib/toast";
import { formatDate, apiRequest } from "@/lib/utils";

interface EditMemberFormProps {
    member: IUser;
    onSuccess: () => void;
    onCancel: () => void;
}

interface FormData {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    isActive: boolean;
}

interface FormErrors {
    [key: string]: string;
}

export default function EditMemberForm({ member, onSuccess, onCancel }: EditMemberFormProps) {
    const [formData, setFormData] = useState<FormData>({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        password: '',
        confirmPassword: '',
        isActive: member.isActive
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        // Phone validation
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/;
            if (!phoneRegex.test(formData.phone.trim())) {
                newErrors.phone = 'Please enter a valid phone number';
            }
        }

        // Email validation (optional)
        if (formData.email.trim()) {
            const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(formData.email.trim())) {
                newErrors.email = 'Please enter a valid email address';
            }
        }

        // Password validation (optional)
        if (formData.password) {
            if (formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        } else if (formData.confirmPassword) {
            newErrors.password = 'Password is required when confirm password is provided';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare update data - only include changed fields
            const updateData: IMemberEdit = {};

            if (formData.name.trim() !== member.name) {
                updateData.name = formData.name.trim();
            }

            if (formData.email.trim() !== (member.email || '')) {
                updateData.email = formData.email.trim() || undefined;
            }

            if (formData.phone.trim() !== member.phone) {
                updateData.phone = formData.phone.trim();
            }

            if (formData.password) {
                updateData.password = formData.password;
            }

            if (formData.isActive !== member.isActive) {
                updateData.isActive = formData.isActive;
            }

            // Only make API call if there are changes
            if (Object.keys(updateData).length === 0) {
                showToast.info('No changes detected');
                onCancel();
                return;
            }

            const response = await fetch(`/api/users/${member._id}/edit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const result = await response.json();

            if (result.success) {
                showToast.success(result.message || 'Member updated successfully');
                onSuccess();
            } else {
                showToast.error(result.error || 'Failed to update member');
            }
        } catch (error) {
            console.error('Error updating member:', error);
            showToast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear specific error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Edit Member</CardTitle>
                        <CardDescription>
                            Update member information and login access
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Member Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Member ID:</span> {member.memberId}
                        </div>
                        <div>
                            <span className="font-medium">Join Date:</span> {formatDate(member.joinDate)}
                        </div>
                        <div>
                            <span className="font-medium">Status:</span>{' '}
                            <Badge className={member.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {member.status}
                            </Badge>
                        </div>
                        <div>
                            <span className="font-medium">Login Access:</span>{' '}
                            <Badge className={member.hasLoginAccess ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                                {member.hasLoginAccess ? 'Yes' : 'No'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Basic Information</h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={errors.name ? 'border-red-300' : ''}
                                />
                                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className={errors.phone ? 'border-red-300' : ''}
                                />
                                {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Login Access */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Login Access</h3>
                        <p className="text-sm text-gray-600">
                            Add email and password to give this member access to the member portal
                        </p>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="Enter email for login access"
                                    className={errors.email ? 'border-red-300' : ''}
                                />
                                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                                {!formData.email && !member.email && (
                                    <p className="text-sm text-blue-600 mt-1">
                                        Leave empty if member doesn&apos;t need login access
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                        placeholder={member.password ? "Leave empty to keep current password" : "Enter new password"}
                                        className={errors.password ? 'border-red-300' : ''}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
                            </div>

                            <div>
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                        placeholder="Confirm new password"
                                        className={errors.confirmPassword ? 'border-red-300' : ''}
                                        disabled={!formData.password}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={!formData.password}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Account Status */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Account Status</h3>

                        <div className="flex items-center space-x-2">
                            <input
                                id="isActive"
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="isActive">Account is active</Label>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Updating...' : 'Update Member'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
