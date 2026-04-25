export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface Meal {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: 'Lunch' | 'Dinner';
  timestamp: string;
}

export interface Settings {
  lunchPrice: number;
  dinnerPrice: number;
}

export interface UserSummary extends Omit<User, 'password'> {
  lunchCount: number;
  dinnerCount: number;
  totalMeals: number;
  totalCost: number;
}

export interface AdminSummary {
  summary: UserSummary[];
  settings: Settings;
  totalStats: {
    totalLunch: number;
    totalDinner: number;
  };
}
