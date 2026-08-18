export enum LeadStatus {
  NEW = 'NEW',
  CALLING = 'CALLING',
  FOLLOW_UP = 'FOLLOW_UP',
  NOT_PICKED_UP = 'NOT_PICKED_UP',
  NOT_INTERESTED = 'NOT_INTERESTED',
  INTERESTED = 'INTERESTED',
  COLD = 'COLD',
  WARM = 'WARM',
  HOT = 'HOT',
  SITE_VISIT = 'SITE_VISIT',
  NEGOTIATION = 'NEGOTIATION',
  BOOKED = 'BOOKED',
  CLOSED = 'CLOSED',
  INVALID_NUMBER = 'INVALID_NUMBER',
}

export enum Temperature {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  UNQUALIFIED = 'UNQUALIFIED',
}

export enum NotInterestedReason {
  BUDGET = 'BUDGET',
  ALREADY_PURCHASED = 'ALREADY_PURCHASED',
  NOT_LOOKING = 'NOT_LOOKING',
  WRONG_LOCATION = 'WRONG_LOCATION',
  LOAN_ISSUE = 'LOAN_ISSUE',
  JUST_BROWSING = 'JUST_BROWSING',
  WRONG_NUMBER = 'WRONG_NUMBER',
  OTHER = 'OTHER',
}

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  PLOT = 'PLOT',
  COMMERCIAL = 'COMMERCIAL',
  PENTHOUSE = 'PENTHOUSE',
  STUDIO = 'STUDIO',
}

export enum BhkType {
  ONE_BHK = '1BHK',
  TWO_BHK = '2BHK',
  THREE_BHK = '3BHK',
  FOUR_BHK = '4BHK',
  FIVE_PLUS_BHK = '5+ BHK',
  STUDIO = 'Studio',
  PLOT = 'Plot',
}

export enum PurchasePurpose {
  SELF_USE = 'SELF_USE',
  INVESTMENT = 'INVESTMENT',
  RENTAL = 'RENTAL',
  UNKNOWN = 'UNKNOWN',
}

export enum PurchaseTimeline {
  IMMEDIATE = 'Immediate (0-30 Days)',
  ONE_TO_THREE_MONTHS = '1-3 Months',
  THREE_TO_SIX_MONTHS = '3-6 Months',
  MORE_THAN_SIX_MONTHS = '6+ Months',
  EXPLORING = 'Just Exploring',
}

export enum FinancingType {
  CASH = 'CASH',
  LOAN = 'LOAN',
  UNDECIDED = 'UNDECIDED',
}
