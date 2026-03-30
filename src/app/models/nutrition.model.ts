export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  macros: Macros;
  autoFetched: boolean;
}

export interface Meal {
  id: string;
  name: string;
  icon: string;
  items: FoodItem[];
  completed: boolean;
  time?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  waterIntake: number; // liters
  notes?: string;
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  icon: string;
  items: FoodItem[];
}

export type ThemeMode = 'aurora' | 'ember' | 'midnight' | 'coral' | 'mint';
export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'ft';
export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

export interface UserProfile {
  email: string;
  name: string;
  age: number | null;
  gender: Gender;
  weight: number | null;
  weightUnit: WeightUnit;
  height: number | null;
  heightUnit: HeightUnit;
  activityLevel: ActivityLevel;
  avatar?: string;
}

export interface AppSettings {
  theme: ThemeMode;
  defaultMeals: string[];
  waterGoal: number;       // liters
  showFiber: boolean;
  showSugar: boolean;
  showSodium: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  email: '',
  name: '',
  age: null,
  gender: 'prefer-not-to-say',
  weight: null,
  weightUnit: 'kg',
  height: null,
  heightUnit: 'cm',
  activityLevel: 'moderate',
};

export const THEME_OPTIONS: { id: ThemeMode; name: string; emoji: string; primary: string; secondary: string; bg: string; gradient: string }[] = [
  { id: 'aurora', name: 'Aurora', emoji: '\uD83D\uDD2E', primary: '#6C5CE7', secondary: '#a29bfe', bg: '#f8f7ff', gradient: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' },
  { id: 'ember', name: 'Ember', emoji: '\uD83D\uDD25', primary: '#e17055', secondary: '#fab1a0', bg: '#fef9f7', gradient: 'linear-gradient(135deg, #e17055, #fab1a0)' },
  { id: 'midnight', name: 'Midnight', emoji: '\uD83C\uDF11', primary: '#0984e3', secondary: '#74b9ff', bg: '#0c1a2e', gradient: 'linear-gradient(135deg, #0984e3, #74b9ff)' },
  { id: 'coral', name: 'Coral', emoji: '\uD83E\uDEB8', primary: '#e84393', secondary: '#fd79a8', bg: '#fef5f8', gradient: 'linear-gradient(135deg, #fd79a8, #e84393)' },
  { id: 'mint', name: 'Neon Mint', emoji: '\uD83D\uDC9A', primary: '#00b894', secondary: '#55efc4', bg: '#f5fdf9', gradient: 'linear-gradient(135deg, #00b894, #55efc4)' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'aurora',
  defaultMeals: ['Breakfast', 'Lunch', 'Dinner'],
  waterGoal: 3,
  showFiber: true,
  showSugar: false,
  showSodium: false,
  notificationsEnabled: false,
};

export const DEFAULT_GOALS: MacroGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 30,
};

export const MEAL_ICONS: { [key: string]: string } = {
  'Breakfast': 'sunny-outline',
  'Lunch': 'restaurant-outline',
  'Dinner': 'moon-outline',
  'Snack': 'nutrition-outline',
  'Pre-Workout': 'barbell-outline',
  'Post-Workout': 'fitness-outline',
  'Custom': 'add-circle-outline',
};

export function emptyMacros(): Macros {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateMealMacros(meal: Meal): Macros {
  return meal.items.reduce(
    (totals, item) => ({
      calories: totals.calories + item.macros.calories,
      protein: totals.protein + item.macros.protein,
      carbs: totals.carbs + item.macros.carbs,
      fat: totals.fat + item.macros.fat,
      fiber: (totals.fiber || 0) + (item.macros.fiber || 0),
      sugar: (totals.sugar || 0) + (item.macros.sugar || 0),
      sodium: (totals.sodium || 0) + (item.macros.sodium || 0),
    }),
    emptyMacros()
  );
}

export function calculateDailyMacros(log: DailyLog): Macros {
  return log.meals.reduce(
    (totals, meal) => {
      const mealMacros = calculateMealMacros(meal);
      return {
        calories: totals.calories + mealMacros.calories,
        protein: totals.protein + mealMacros.protein,
        carbs: totals.carbs + mealMacros.carbs,
        fat: totals.fat + mealMacros.fat,
        fiber: (totals.fiber || 0) + (mealMacros.fiber || 0),
        sugar: (totals.sugar || 0) + (mealMacros.sugar || 0),
        sodium: (totals.sodium || 0) + (mealMacros.sodium || 0),
      };
    },
    emptyMacros()
  );
}
