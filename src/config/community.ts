// Community configuration constants
export const COMMUNITY_CONFIG = {
  // Community opening date - September 15, 2022
  OPENING_DATE: new Date('2023-09-15'),
  
  // Default monthly contribution amount in NPR
  DEFAULT_CONTRIBUTION_AMOUNT: 2000,
  
  // Community name and details
  NAME: 'Community Savings Group',
  
  // Policy descriptions
  POLICIES: {
    HISTORICAL_CONTRIBUTIONS: 'All members must contribute from community opening date (September 15, 2022) or their join date, whichever is later, up to the current month.',
    MONTHLY_CONTRIBUTION: 'Monthly contribution of NPR 2,000 is required from all active members.',
    CATCH_UP_POLICY: 'New members must pay all missing contributions from their required start date before becoming fully active.'
  }
} as const;

// Helper functions for community-related calculations
export const getCommunityStartDate = (): Date => {
  return new Date(COMMUNITY_CONFIG.OPENING_DATE);
};

export const getRequiredContributionStartDate = (memberJoinDate: string | Date): Date => {
  const joinDate = new Date(memberJoinDate);
  const communityOpeningDate = getCommunityStartDate();
  
  // Use the later of community opening date or member join date
  return joinDate > communityOpeningDate ? joinDate : communityOpeningDate;
};

export const formatCommunityAge = (): string => {
  const openingDate = getCommunityStartDate();
  const now = new Date();
  const diffInMonths = (now.getFullYear() - openingDate.getFullYear()) * 12 + 
                      (now.getMonth() - openingDate.getMonth());
  
  const years = Math.floor(diffInMonths / 12);
  const months = diffInMonths % 12;
  
  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else if (months === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''}`;
  }
};
