// @ts-ignore - Library doesn't have proper TypeScript support
import { ADToBS, BSToAD } from 'bikram-sambat-js';

export interface NepaliDateResult {
    year: number;
    month: number;
    date: number;
    day?: string;
}

export interface BSDate {
    year: number;
    month: number;
    day: number;
}

export interface ADDate {
    year: number;
    month: number;
    day: number;
}

/**
 * Convert Bikram Sambat (BS) date to Anno Domini (AD) date
 * @param bsDate - BS date in format "YYYY-MM-DD" or object
 * @returns AD date object
 */
export const convertBSToAD = (bsDate: string | BSDate): ADDate => {
    try {
        let bsDateString: string;

        if (typeof bsDate === 'string') {
            // Format: "2081-05-15"
            bsDateString = bsDate;
        } else {
            // Object format: { year: 2081, month: 5, day: 15 }
            bsDateString = formatBSDate(bsDate);
        }

        // Use BSToAD from bikram-sambat-js library
        const adDateString = BSToAD(bsDateString);
        const [year, month, day] = adDateString.split('-').map(Number);

        return {
            year,
            month,
            day
        };
    } catch (error) {
        console.error('Error converting BS to AD:', error);
        throw new Error('Invalid Bikram Sambat date');
    }
};

/**
 * Convert Anno Domini (AD) date to Bikram Sambat (BS) date
 * @param adDate - AD date in format "YYYY-MM-DD" or object
 * @returns BS date object
 */
export const convertADToBS = (adDate: string | ADDate): BSDate => {
    try {
        let adDateObject: Date;

        if (typeof adDate === 'string') {
            // Format: "2024-08-31"
            const [year, month, day] = adDate.split('-').map(Number);
            adDateObject = new Date(year, month - 1, day); // Month is 0-indexed in Date constructor
        } else {
            // Object format: { year: 2024, month: 8, day: 31 }
            adDateObject = new Date(adDate.year, adDate.month - 1, adDate.day); // Month is 0-indexed
        }

        // Use ADToBS from bikram-sambat-js library
        const bsDateString = ADToBS(adDateObject);
        const [year, month, day] = bsDateString.split('-').map(Number);

        return {
            year,
            month,
            day
        };
    } catch (error) {
        console.error('Error converting AD to BS:', error);
        throw new Error('Invalid Anno Domini date');
    }
};

/**
 * Format BS date to string in "YYYY-MM-DD" format
 */
export const formatBSDate = (bsDate: BSDate): string => {
    const year = bsDate.year.toString().padStart(4, '0');
    const month = bsDate.month.toString().padStart(2, '0');
    const day = bsDate.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format AD date to string in "YYYY-MM-DD" format
 */
export const formatADDate = (adDate: ADDate): string => {
    const year = adDate.year.toString().padStart(4, '0');
    const month = adDate.month.toString().padStart(2, '0');
    const day = adDate.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get current date in BS format
 */
export const getCurrentBSDate = (): BSDate => {
    const today = new Date();
    return convertADToBS({
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate()
    });
};

/**
 * Validate BS date format and values
 */
export const isValidBSDate = (bsDateString: string): boolean => {
    try {
        // Check format first
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(bsDateString)) {
            return false;
        }

        // Try to convert to verify validity
        convertBSToAD(bsDateString);
        return true;
    } catch {
        return false;
    }
};

/**
 * Get Nepali month names
 */
export const getNepaliMonthNames = (): string[] => {
    return [
        'बैशाख', 'जेठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन',
        'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
    ];
};

/**
 * Get English month names for BS calendar
 */
export const getBSMonthNamesEnglish = (): string[] => {
    return [
        'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
        'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
    ];
};
