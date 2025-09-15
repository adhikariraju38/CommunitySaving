# Dynamic Historical Contributions Policy

## Community Opening Date: September 15, 2022

The historical contributions system now dynamically calculates required contributions based on the actual community opening date rather than a fixed 2-year period.

## How It Works

Members must contribute from:

- **Community Opening Date** (September 15, 2022) **OR**
- **Their Join Date**
- **Whichever is LATER**

All contributions are required **up to the current month**.

## Examples

### Example 1: Early Member

- **Member Join Date**: August 1, 2022 (before community opening)
- **Required Contributions Start**: September 15, 2022 (community opening date)
- **Required Contributions End**: Current month
- **Reason**: Community wasn't active before Sept 15, 2022

### Example 2: Founding Member

- **Member Join Date**: September 15, 2022 (exact community opening)
- **Required Contributions Start**: September 15, 2022
- **Required Contributions End**: Current month
- **Reason**: Joined when community opened

### Example 3: New Member

- **Member Join Date**: March 10, 2024 (after community opening)
- **Required Contributions Start**: March 10, 2024 (their join date)
- **Required Contributions End**: Current month
- **Reason**: They only need to contribute from when they joined

### Example 4: Member Who Left and Rejoined

- **Original Join Date**: October 1, 2022
- **Left Community**: June 1, 2023
- **Rejoined**: January 15, 2024
- **Required Contributions Start**: January 15, 2024 (most recent join date)
- **Required Contributions End**: Current month
- **Reason**: Fresh start from rejoin date

## Benefits of Dynamic Policy

1. **Fair to All Members**: No one pays for months before the community existed
2. **Accurate Historical Record**: Reflects actual community timeline
3. **Flexible for Growth**: Automatically adjusts as community ages
4. **Easy Maintenance**: No manual policy updates needed
5. **Clear Documentation**: Policy is self-explanatory with examples

## Technical Implementation

- Community opening date: Configurable in `/src/config/community.ts`
- Default contribution amount: NPR 2,000 (also configurable)
- Calculation happens server-side in `/api/historical-contributions`
- UI shows dynamic policy description with current community age

## Configuration

To change the community opening date, update:

```typescript
// /src/config/community.ts
export const COMMUNITY_CONFIG = {
  OPENING_DATE: new Date("2022-09-15"), // Update this date
  DEFAULT_CONTRIBUTION_AMOUNT: 2000, // Update default amount
  // ...
};
```
