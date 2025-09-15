"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent } from './card';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    searchText?: string; // Additional text to search against
}

interface SearchableSelectProps {
    label?: string;
    value?: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    id?: string;
    error?: string;
    emptyText?: string;
    searchPlaceholder?: string;
}

export function SearchableSelect({
    label,
    value,
    options,
    onChange,
    placeholder = "Select option",
    disabled = false,
    required = false,
    className = "",
    id,
    error,
    emptyText = "No options found",
    searchPlaceholder = "Search..."
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const selectRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Update filtered options when search term or options change
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredOptions(options);
        } else {
            const filtered = options.filter(option => {
                const searchText = `${option.label} ${option.searchText || ''}`.toLowerCase();
                return searchText.includes(searchTerm.toLowerCase());
            });
            setFilteredOptions(filtered);
        }
        setHighlightedIndex(-1);
    }, [searchTerm, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchRef.current) {
            searchRef.current.focus();
        }
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setHighlightedIndex(prev =>
                        prev < filteredOptions.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : filteredOptions.length - 1
                    );
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                        handleOptionSelect(filteredOptions[highlightedIndex].value);
                    }
                    break;
                case 'Escape':
                    setIsOpen(false);
                    setSearchTerm('');
                    break;
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, highlightedIndex, filteredOptions]);

    const handleOptionSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const clearSelection = () => {
        onChange('');
        setSearchTerm('');
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                setSearchTerm('');
            }
        }
    };

    const selectedOption = options.find(option => option.value === value);

    return (
        <div className={`relative space-y-2 ${className}`} ref={selectRef}>
            {label && (
                <Label htmlFor={id} className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
            )}

            <div className="relative">
                <Button
                    type="button"
                    variant="outline"
                    onClick={toggleDropdown}
                    disabled={disabled}
                    className={`w-full justify-between h-10 px-3 py-2 text-left ${error ? 'border-red-500' : ''
                        } ${!selectedOption ? 'text-muted-foreground' : ''}`}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <div className="flex items-center space-x-1">
                        {selectedOption && !disabled && (
                            <X
                                className="h-4 w-4 hover:text-red-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearSelection();
                                }}
                            />
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </Button>
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <Card className="absolute top-full left-0 z-50 w-full mt-1 shadow-lg">
                    <CardContent className="p-0">
                        {/* Search Input */}
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    ref={searchRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleOptionSelect(option.value)}
                                        className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground flex items-center justify-between ${index === highlightedIndex ? 'bg-accent text-accent-foreground' : ''
                                            } ${option.value === value ? 'bg-primary/10 text-primary' : ''
                                            }`}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {option.value === value && (
                                            <Check className="h-4 w-4 flex-shrink-0" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                                    {emptyText}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
}

export default SearchableSelect;
