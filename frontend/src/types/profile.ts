export interface EmailSubscriptions {
  weekly: boolean;
  monthly: boolean;
}

export interface Profile {
  email: string;
  displayName: string;
  heightCm: number;
  weightKg: number;
  emailSubscriptions?: EmailSubscriptions;
  updatedAt?: string;
}
