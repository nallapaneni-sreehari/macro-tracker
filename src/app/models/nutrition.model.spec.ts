import {
  emptyMacros,
  generateId,
  getTodayKey,
  calculateMealMacros,
  calculateDailyMacros,
  DEFAULT_GOALS,
  DEFAULT_SETTINGS,
  Meal,
  DailyLog,
  FoodItem,
} from './nutrition.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFood(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: 'f1',
    name: 'Test Food',
    servingSize: 100,
    servingUnit: 'g',
    autoFetched: false,
    macros: { calories: 200, protein: 20, carbs: 25, fat: 5, fiber: 2, sugar: 3, sodium: 100 },
    ...overrides,
  };
}

function makeMeal(items: FoodItem[] = [], overrides: Partial<Meal> = {}): Meal {
  return { id: 'm1', name: 'Breakfast', icon: 'sunny-outline', completed: false, items, ...overrides };
}

// ─── emptyMacros ─────────────────────────────────────────────────────────────

describe('emptyMacros()', () => {
  it('returns zero for every macro', () => {
    const m = emptyMacros();
    expect(m.calories).toBe(0);
    expect(m.protein).toBe(0);
    expect(m.carbs).toBe(0);
    expect(m.fat).toBe(0);
    expect(m.fiber).toBe(0);
    expect(m.sugar).toBe(0);
    expect(m.sodium).toBe(0);
  });

  it('returns a new object each call', () => {
    expect(emptyMacros()).not.toBe(emptyMacros());
  });
});

// ─── generateId ──────────────────────────────────────────────────────────────

describe('generateId()', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('generates unique ids on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ─── getTodayKey ─────────────────────────────────────────────────────────────

describe('getTodayKey()', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    expect(getTodayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current date', () => {
    const expected = new Date().toISOString().split('T')[0];
    expect(getTodayKey()).toBe(expected);
  });
});

// ─── calculateMealMacros ─────────────────────────────────────────────────────

describe('calculateMealMacros()', () => {
  it('returns empty macros for a meal with no items', () => {
    const result = calculateMealMacros(makeMeal([]));
    expect(result).toEqual(emptyMacros());
  });

  it('sums a single food item correctly', () => {
    const food = makeFood();
    const result = calculateMealMacros(makeMeal([food]));
    expect(result.calories).toBe(200);
    expect(result.protein).toBe(20);
    expect(result.carbs).toBe(25);
    expect(result.fat).toBe(5);
    expect(result.fiber).toBe(2);
    expect(result.sugar).toBe(3);
    expect(result.sodium).toBe(100);
  });

  it('correctly sums multiple food items', () => {
    const food1 = makeFood({ id: 'f1', macros: { calories: 100, protein: 10, carbs: 12, fat: 3, fiber: 1, sugar: 2, sodium: 50 } });
    const food2 = makeFood({ id: 'f2', macros: { calories: 150, protein: 8,  carbs: 20, fat: 5, fiber: 3, sugar: 7, sodium: 80 } });
    const result = calculateMealMacros(makeMeal([food1, food2]));
    expect(result.calories).toBe(250);
    expect(result.protein).toBe(18);
    expect(result.carbs).toBe(32);
    expect(result.fat).toBe(8);
    expect(result.fiber).toBe(4);
    expect(result.sugar).toBe(9);
    expect(result.sodium).toBe(130);
  });

  it('treats missing optional macros as 0', () => {
    const food = makeFood({ macros: { calories: 100, protein: 10, carbs: 10, fat: 2 } });
    const result = calculateMealMacros(makeMeal([food]));
    expect(result.fiber).toBe(0);
    expect(result.sugar).toBe(0);
    expect(result.sodium).toBe(0);
  });
});

// ─── calculateDailyMacros ────────────────────────────────────────────────────

describe('calculateDailyMacros()', () => {
  it('returns empty macros for a log with no meals', () => {
    const log: DailyLog = { date: '2026-01-01', meals: [], waterIntake: 0 };
    expect(calculateDailyMacros(log)).toEqual(emptyMacros());
  });

  it('sums macros across multiple meals', () => {
    const meal1 = makeMeal([makeFood({ id: 'f1', macros: { calories: 300, protein: 30, carbs: 40, fat: 8 } })], { id: 'm1' });
    const meal2 = makeMeal([makeFood({ id: 'f2', macros: { calories: 200, protein: 15, carbs: 25, fat: 5 } })], { id: 'm2' });
    const log: DailyLog = { date: '2026-01-01', meals: [meal1, meal2], waterIntake: 0 };
    const result = calculateDailyMacros(log);
    expect(result.calories).toBe(500);
    expect(result.protein).toBe(45);
    expect(result.carbs).toBe(65);
    expect(result.fat).toBe(13);
  });

  it('correctly handles a completed meal', () => {
    const meal = makeMeal(
      [makeFood({ id: 'f1', macros: { calories: 500, protein: 40, carbs: 60, fat: 10 } })],
      { completed: true }
    );
    const log: DailyLog = { date: '2026-01-01', meals: [meal], waterIntake: 2 };
    expect(calculateDailyMacros(log).calories).toBe(500);
  });
});

// ─── DEFAULT_GOALS ───────────────────────────────────────────────────────────

describe('DEFAULT_GOALS', () => {
  it('has sensible positive values', () => {
    expect(DEFAULT_GOALS.calories).toBeGreaterThan(0);
    expect(DEFAULT_GOALS.protein).toBeGreaterThan(0);
    expect(DEFAULT_GOALS.carbs).toBeGreaterThan(0);
    expect(DEFAULT_GOALS.fat).toBeGreaterThan(0);
  });
});

// ─── DEFAULT_SETTINGS ────────────────────────────────────────────────────────

describe('DEFAULT_SETTINGS', () => {
  it('has aurora as default theme', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('aurora');
  });

  it('includes at least one default meal', () => {
    expect(DEFAULT_SETTINGS.defaultMeals.length).toBeGreaterThan(0);
  });

  it('has a positive water goal', () => {
    expect(DEFAULT_SETTINGS.waterGoal).toBeGreaterThan(0);
  });
});
