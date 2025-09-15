"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, X } from 'lucide-react';
import { convertBSToAD, convertADToBS, formatBSDate, formatADDate, isValidBSDate, getCurrentBSDate, getBSMonthNamesEnglish } from '@/lib/nepali-date';

interface NepaliDatePickerProps {
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

export function NepaliDatePicker({
    label,
    value,
    onChange,
    placeholder = "Select date",
    disabled = false,
    required = false,
    className = "",
    id,
    error,
    showTodayButton = true
}: NepaliDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [bsValue, setBsValue] = useState<string>('');
    const [adValue, setAdValue] = useState<string>('');
    const [selectedBSDate, setSelectedBSDate] = useState<{ year: number; month: number; day: number } | null>(null);
    const [viewMonth, setViewMonth] = useState<number>(1);
    const [viewYear, setViewYear] = useState<number>(2081);
    const [showADDate, setShowADDate] = useState<boolean>(false);
    const [validationError, setValidationError] = useState<string>('');

    const pickerRef = useRef<HTMLDivElement>(null);

    // Convert AD value to BS when prop changes
    useEffect(() => {
        if (value) {
            try {
                const bsDate = convertADToBS(value);
                const bsString = formatBSDate(bsDate);
                setBsValue(bsString);
                setAdValue(value);
                setSelectedBSDate(bsDate);
                setViewMonth(bsDate.month);
                setViewYear(bsDate.year);
                setValidationError('');
            } catch (error) {
                console.error('Error converting AD to BS:', error);
                setBsValue('');
                setAdValue('');
                setSelectedBSDate(null);
            }
        } else {
            setBsValue('');
            setAdValue('');
            setSelectedBSDate(null);
            // Set to current BS date for initial view
            try {
                const currentBS = getCurrentBSDate();
                setViewMonth(currentBS.month);
                setViewYear(currentBS.year);
            } catch (error) {
                // Fallback to a known BS date
                setViewMonth(5);
                setViewYear(2081);
            }
        }
    }, [value]);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleDateSelect = (day: number) => {
        try {
            const bsDate = { year: viewYear, month: viewMonth, day };
            const adDate = convertBSToAD(bsDate);
            const bsString = formatBSDate(bsDate);
            const adString = formatADDate(adDate);

            setBsValue(bsString);
            setAdValue(adString);
            setSelectedBSDate(bsDate);
            setValidationError('');
            onChange(adString);
            setIsOpen(false);
        } catch (error) {
            console.error('Error converting selected date:', error);
            setValidationError('Invalid date selected');
        }
    };

    const setToday = () => {
        try {
            const currentBS = getCurrentBSDate();
            const currentAD = convertBSToAD(currentBS);
            const bsString = formatBSDate(currentBS);
            const adString = formatADDate(currentAD);

            setBsValue(bsString);
            setAdValue(adString);
            setSelectedBSDate(currentBS);
            setViewMonth(currentBS.month);
            setViewYear(currentBS.year);
            setValidationError('');
            onChange(adString);
            setIsOpen(false);
        } catch (error) {
            console.error('Error setting today date:', error);
            setValidationError('Error setting current date');
        }
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'next') {
            if (viewMonth === 12) {
                setViewMonth(1);
                setViewYear(viewYear + 1);
            } else {
                setViewMonth(viewMonth + 1);
            }
        } else {
            if (viewMonth === 1) {
                setViewMonth(12);
                setViewYear(viewYear - 1);
            } else {
                setViewMonth(viewMonth - 1);
            }
        }
    };

    const getDaysInBSMonth = (year: number, month: number): number => {
        // Approximate days in BS months (this is a simplified version)
        // In a real implementation, you'd want a more accurate calendar data
        const daysInMonths = [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30];
        return daysInMonths[month - 1] || 30;
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInBSMonth(viewYear, viewMonth);
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = selectedBSDate &&
                selectedBSDate.year === viewYear &&
                selectedBSDate.month === viewMonth &&
                selectedBSDate.day === day;

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateSelect(day)}
                    className={`
            w-8 h-8 text-sm border border-gray-200 hover:bg-blue-100 
            ${isSelected ? 'bg-blue-500 text-white' : 'bg-white'}
            ${day === 1 ? 'rounded-tl' : ''}
            ${day === 7 ? 'rounded-tr' : ''}
          `}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    const toggleDateDisplay = () => {
        setShowADDate(!showADDate);
    };

    const clearDate = () => {
        setBsValue('');
        setAdValue('');
        setSelectedBSDate(null);
        setValidationError('');
        onChange('');
    };

    const displayError = error || validationError;
    const monthNames = getBSMonthNamesEnglish();

    return (
        <div className={`relative space-y-2 ${className}`} ref={pickerRef}>
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
                            onClick={() => !disabled && setIsOpen(!isOpen)}
                            placeholder={placeholder}
                            disabled={disabled}
                            readOnly
                            className={`cursor-pointer ${displayError ? 'border-red-500' : ''}`}
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

                    {adValue && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearDate}
                            disabled={disabled}
                            className="px-3"
                            title="Clear date"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Date Picker Modal */}
            {isOpen && !disabled && (
                <Card className="absolute top-full left-0 z-50 w-80 mt-1 shadow-lg">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateMonth('prev')}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <CardTitle className="text-sm font-medium">
                                {monthNames[viewMonth - 1]} {viewYear}
                            </CardTitle>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateMonth('next')}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-3">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>

                        {showTodayButton && (
                            <div className="mt-3 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={setToday}
                                    className="w-full"
                                >
                                    Today
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

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
                Click to select a date in Bikram Sambat (BS) calendar
            </p>
        </div>
    );
}

export default NepaliDatePicker;
