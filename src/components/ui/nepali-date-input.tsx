"use client";

import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Calendar, CalendarDays } from 'lucide-react';
import { convertBSToAD, convertADToBS, formatBSDate, formatADDate, isValidBSDate, getCurrentBSDate } from '@/lib/nepali-date';

interface NepaliDateInputProps {
    label?: string;
    value?: string; // AD date in "YYYY-MM-DD" format
    onChange: (adDate: string) => void; // Returns AD date
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    id?: string;
    error?: string;
    showTodayButton?: boolean;
}

export function NepaliDateInput({
    label,
    value,
    onChange,
    placeholder = "YYYY-MM-DD (BS)",
    disabled = false,
    required = false,
    className = "",
    id,
    error,
    showTodayButton = true
}: NepaliDateInputProps) {
    const [bsValue, setBsValue] = useState<string>('');
    const [adValue, setAdValue] = useState<string>('');
    const [validationError, setValidationError] = useState<string>('');
    const [showADDate, setShowADDate] = useState<boolean>(false);

    // Convert AD value to BS when prop changes
    useEffect(() => {
        if (value) {
            try {
                const bsDate = convertADToBS(value);
                const bsString = formatBSDate(bsDate);
                setBsValue(bsString);
                setAdValue(value);
                setValidationError('');
            } catch (error) {
                console.error('Error converting AD to BS:', error);
                setBsValue('');
                setAdValue('');
            }
        } else {
            setBsValue('');
            setAdValue('');
        }
    }, [value]);

    const handleBSDateChange = (bsDateString: string) => {
        setBsValue(bsDateString);
        setValidationError('');

        if (!bsDateString.trim()) {
            setAdValue('');
            onChange('');
            return;
        }

        // Validate format first
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(bsDateString)) {
            setValidationError('Invalid format. Use YYYY-MM-DD');
            setAdValue('');
            return;
        }

        try {
            // Convert BS to AD
            const adDate = convertBSToAD(bsDateString);
            const adString = formatADDate(adDate);
            setAdValue(adString);
            onChange(adString);
        } catch (error) {
            setValidationError('Invalid Bikram Sambat date');
            setAdValue('');
        }
    };

    const setToday = () => {
        try {
            const currentBS = getCurrentBSDate();
            const bsString = formatBSDate(currentBS);
            handleBSDateChange(bsString);
        } catch (error) {
            console.error('Error setting today date:', error);
            setValidationError('Error setting current date');
        }
    };

    const toggleDateDisplay = () => {
        setShowADDate(!showADDate);
    };

    const displayError = error || validationError;

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <Label htmlFor={id} className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                    <span className="text-xs text-muted-foreground ml-1">(Bikram Sambat)</span>
                </Label>
            )}

            <div className="relative">
                <div className="flex space-x-2">
                    <div className="flex-1 relative">
                        <Input
                            id={id}
                            type="text"
                            value={bsValue}
                            onChange={(e) => handleBSDateChange(e.target.value)}
                            placeholder={placeholder}
                            disabled={disabled}
                            className={`${displayError ? 'border-red-500' : ''}`}
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {showTodayButton && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={setToday}
                            disabled={disabled}
                            className="px-3"
                        >
                            Today
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleDateDisplay}
                        disabled={disabled || !adValue}
                        className="px-3"
                        title={showADDate ? "Show BS date" : "Show AD date"}
                    >
                        <CalendarDays className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Display converted AD date */}
            {adValue && showADDate && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <strong>AD Date:</strong> {adValue}
                </div>
            )}

            {/* Error message */}
            {displayError && (
                <p className="text-xs text-red-500">{displayError}</p>
            )}

            {/* Help text */}
            <p className="text-xs text-muted-foreground">
                Enter date in Bikram Sambat (BS) format: YYYY-MM-DD
                <br />
                Example: 2081-05-15 (15th Bhadra 2081)
            </p>
        </div>
    );
}

export default NepaliDateInput;
