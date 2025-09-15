import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
  }).format(amount)
}

// Format date
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// Format date with time
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Get month name from month string (YYYY-MM)
export function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
}

// Calculate loan interest
export function calculateLoanInterest(
  principal: number,
  interestRate: number,
  durationMonths: number
): number {
  return (principal * (interestRate / 100) * (durationMonths / 12));
}

// Get loan status color
export function getLoanStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'approved':
      return 'text-blue-600 bg-blue-100';
    case 'disbursed':
      return 'text-green-600 bg-green-100';
    case 'completed':
      return 'text-gray-600 bg-gray-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// Get contribution status color
export function getContributionStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'text-green-600 bg-green-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'overdue':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// Validate form data
export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePhone(phone: string, required: boolean = true): string | null {
  if (!phone) {
    return required ? 'Phone number is required' : null;
  }

  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return 'Please enter a valid phone number';
  }
  return null;
}

export function validateAmount(
  amount: number | string,
  min: number = 0,
  max: number = Infinity,
  fieldName: string = 'Amount'
): string | null {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return `${fieldName} must be a valid number`;
  }

  if (numAmount < min) {
    return `${fieldName} must be at least ${formatCurrency(min)}`;
  }

  if (numAmount > max) {
    return `${fieldName} cannot exceed ${formatCurrency(max)}`;
  }

  return null;
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// API helper functions
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If JSON parsing fails, create a fallback error response
      data = {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    if (!response.ok) {
      const errorMessage = (data && typeof data === 'object' && data.message)
        ? data.message
        : `HTTP ${response.status}: ${response.statusText}`;
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

// Local storage helpers with error handling
export function setLocalStorage(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

export function getLocalStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue || null;
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return defaultValue || null;
  }
}

export function removeLocalStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
    return false;
  }
}
