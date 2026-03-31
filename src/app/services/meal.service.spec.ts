import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MealService } from './meal.service';
import { StorageService } from './storage.service';
import { DEFAULT_GOALS, FoodItem, MacroGoals, Meal, MealTemplate } from '../models/nutrition.model';

// ─── StorageService mock ──────────────────────────────────────────────────────

const store: Record<string, any> = {};

const storageMock: Partial<StorageService> = {
  get: jasmine.createSpy('get').and.callFake(<T>(key: string) =>
    Promise.resolve<T | null>(store[key] ?? null)
  ),
  set: jasmine.createSpy('set').and.callFake((key: string, value: any) => {
    store[key] = JSON.parse(JSON.stringify(value));
    return Promise.resolve();
  }),
  remove: jasmine.createSpy('remove').and.callFake((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
  keys: jasmine.createSpy('keys').and.callFake(() =>
    Promise.resolve(Object.keys(store))
  ),
  // Return null so MealService skips the server-fetch branch in unit tests
  getUserEmail: jasmine.createSpy('getUserEmail').and.returnValue(null),
  setUserEmail: jasmine.createSpy('setUserEmail'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFood(id: string, calories = 200): FoodItem {
  return {
    id,
    name: `Food-${id}`,
    servingSize: 100,
    servingUnit: 'g',
    autoFetched: false,
    macros: { calories, protein: 20, carbs: 25, fat: 5, fiber: 2, sugar: 1, sodium: 50 },
  };
}

const TODAY = new Date().toISOString().split('T')[0];

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('MealService', () => {
  let service: MealService;

  beforeEach(fakeAsync(() => {
    Object.keys(store).forEach(k => delete store[k]);
    Object.values(storageMock).forEach(s => (s as jasmine.Spy).calls.reset());
    (storageMock.get as jasmine.Spy).and.callFake(<T>(key: string) =>
      Promise.resolve<T | null>(store[key] ?? null)
    );
    (storageMock.set as jasmine.Spy).and.callFake((key: string, value: any) => {
      store[key] = JSON.parse(JSON.stringify(value));
      return Promise.resolve();
    });
    (storageMock.getUserEmail as jasmine.Spy).and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MealService,
        { provide: StorageService, useValue: storageMock },
      ],
    });

    service = TestBed.inject(MealService);
    tick(); // let init() async resolve
  }));

  // ── initialisation ─────────────────────────────────────────────────────────

  describe('init', () => {
    it('emits DEFAULT_GOALS when no goals are stored', () => {
      expect(service.goals$.value).toEqual(DEFAULT_GOALS);
    });

    it('emits stored goals on init', fakeAsync(() => {
      const custom: MacroGoals = { calories: 1800, protein: 130, carbs: 200, fat: 60, fiber: 25 };
      store['macro_goals'] = custom;

      // Re-create service with pre-seeded store
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          MealService,
          { provide: StorageService, useValue: storageMock },
        ],
      });
      const svc = TestBed.inject(MealService);
      tick();
      expect(svc.goals$.value).toEqual(custom);
    }));

    it('creates an empty log for today when none exists', fakeAsync(() => {
      tick();
      const log = service.currentLog$.value;
      expect(log).not.toBeNull();
      expect(log!.date).toBe(TODAY);
      expect(log!.meals).toEqual([]);
      expect(log!.waterIntake).toBe(0);
    }));
  });

  // ── loadDay ────────────────────────────────────────────────────────────────

  describe('loadDay()', () => {
    it('returns a new empty log for an unknown date', async () => {
      const log = await service.loadDay('2025-01-01');
      expect(log.date).toBe('2025-01-01');
      expect(log.meals).toEqual([]);
    });

    it('returns the stored log for a known date', async () => {
      store[`daily_log_2025-06-15`] = {
        date: '2025-06-15',
        meals: [],
        waterIntake: 1.5,
      };
      const log = await service.loadDay('2025-06-15');
      expect(log.waterIntake).toBe(1.5);
    });

    it('updates currentLog$ when loading today', async () => {
      await service.loadDay(TODAY);
      expect(service.currentLog$.value?.date).toBe(TODAY);
    });
  });

  // ── addMeal ────────────────────────────────────────────────────────────────

  describe('addMeal()', () => {
    it('adds a meal and returns it', async () => {
      const meal = await service.addMeal(TODAY, 'Lunch', 'restaurant-outline');
      expect(meal.name).toBe('Lunch');
      expect(meal.icon).toBe('restaurant-outline');
      expect(meal.completed).toBeFalse();
      expect(meal.items).toEqual([]);
    });

    it('persists the meal to storage', async () => {
      await service.addMeal(TODAY, 'Dinner', 'moon-outline');
      const log = service.currentLog$.value;
      expect(log!.meals.length).toBe(1);
      expect(log!.meals[0].name).toBe('Dinner');
    });

    it('generates a unique id for each meal', async () => {
      const m1 = await service.addMeal(TODAY, 'Meal A', 'sunny-outline');
      const m2 = await service.addMeal(TODAY, 'Meal B', 'moon-outline');
      expect(m1.id).not.toBe(m2.id);
    });
  });

  // ── removeMeal ─────────────────────────────────────────────────────────────

  describe('removeMeal()', () => {
    it('removes the specified meal', async () => {
      const meal = await service.addMeal(TODAY, 'To Delete', 'trash-outline');
      await service.removeMeal(TODAY, meal.id);
      expect(service.currentLog$.value!.meals).toEqual([]);
    });

    it('does not affect other meals', async () => {
      const m1 = await service.addMeal(TODAY, 'Keep', 'sunny-outline');
      const m2 = await service.addMeal(TODAY, 'Remove', 'trash-outline');
      await service.removeMeal(TODAY, m2.id);
      const meals = service.currentLog$.value!.meals;
      expect(meals.length).toBe(1);
      expect(meals[0].id).toBe(m1.id);
    });
  });

  // ── toggleMealComplete ─────────────────────────────────────────────────────

  describe('toggleMealComplete()', () => {
    it('marks an incomplete meal as complete', async () => {
      const meal = await service.addMeal(TODAY, 'Breakfast', 'sunny-outline');
      expect(meal.completed).toBeFalse();
      await service.toggleMealComplete(TODAY, meal.id);
      const updated = service.currentLog$.value!.meals.find(m => m.id === meal.id)!;
      expect(updated.completed).toBeTrue();
    });

    it('toggles back to incomplete', async () => {
      const meal = await service.addMeal(TODAY, 'Snack', 'nutrition-outline');
      await service.toggleMealComplete(TODAY, meal.id);
      await service.toggleMealComplete(TODAY, meal.id);
      const updated = service.currentLog$.value!.meals.find(m => m.id === meal.id)!;
      expect(updated.completed).toBeFalse();
    });
  });

  // ── renameMeal ─────────────────────────────────────────────────────────────

  describe('renameMeal()', () => {
    it('updates name and icon', async () => {
      const meal = await service.addMeal(TODAY, 'Old Name', 'sunny-outline');
      await service.renameMeal(TODAY, meal.id, 'New Name', 'moon-outline');
      const updated = service.currentLog$.value!.meals.find(m => m.id === meal.id)!;
      expect(updated.name).toBe('New Name');
      expect(updated.icon).toBe('moon-outline');
    });
  });

  // ── addFoodItem ────────────────────────────────────────────────────────────

  describe('addFoodItem()', () => {
    it('adds a food item to the meal', async () => {
      const meal = await service.addMeal(TODAY, 'Breakfast', 'sunny-outline');
      const food = makeFood('f1');
      await service.addFoodItem(TODAY, meal.id, food);
      const updatedMeal = service.currentLog$.value!.meals.find(m => m.id === meal.id)!;
      expect(updatedMeal.items.length).toBe(1);
      expect(updatedMeal.items[0].name).toBe('Food-f1');
    });
  });

  // ── updateFoodItem ─────────────────────────────────────────────────────────

  describe('updateFoodItem()', () => {
    it('updates an existing food item', async () => {
      const meal = await service.addMeal(TODAY, 'Lunch', 'restaurant-outline');
      const food = makeFood('f1', 200);
      await service.addFoodItem(TODAY, meal.id, food);

      const updated = { ...food, macros: { ...food.macros, calories: 350 } };
      await service.updateFoodItem(TODAY, meal.id, updated);

      const item = service.currentLog$.value!.meals
        .find(m => m.id === meal.id)!.items
        .find(i => i.id === 'f1')!;
      expect(item.macros.calories).toBe(350);
    });
  });

  // ── removeFoodItem ─────────────────────────────────────────────────────────

  describe('removeFoodItem()', () => {
    it('removes the specified food item', async () => {
      const meal = await service.addMeal(TODAY, 'Dinner', 'moon-outline');
      const food = makeFood('f1');
      await service.addFoodItem(TODAY, meal.id, food);
      await service.removeFoodItem(TODAY, meal.id, 'f1');
      const updatedMeal = service.currentLog$.value!.meals.find(m => m.id === meal.id)!;
      expect(updatedMeal.items).toEqual([]);
    });
  });

  // ── updateWater ────────────────────────────────────────────────────────────

  describe('updateWater()', () => {
    it('sets water intake on the log', async () => {
      await service.updateWater(TODAY, 2.5);
      expect(service.currentLog$.value!.waterIntake).toBe(2.5);
    });

    it('clamps water intake to 0 (no negative values)', async () => {
      await service.updateWater(TODAY, -1);
      expect(service.currentLog$.value!.waterIntake).toBe(0);
    });

    it('rounds to 2 decimal places', async () => {
      await service.updateWater(TODAY, 1.555);
      expect(service.currentLog$.value!.waterIntake).toBe(1.56);
    });
  });

  // ── saveGoals ──────────────────────────────────────────────────────────────

  describe('saveGoals()', () => {
    it('updates goals$ BehaviorSubject', async () => {
      const newGoals: MacroGoals = { calories: 1600, protein: 120, carbs: 180, fat: 55, fiber: 20 };
      await service.saveGoals(newGoals);
      expect(service.goals$.value).toEqual(newGoals);
    });

    it('persists goals to storage', async () => {
      const newGoals: MacroGoals = { calories: 2500, protein: 180, carbs: 300, fat: 70 };
      await service.saveGoals(newGoals);
      expect(storageMock.set).toHaveBeenCalledWith('macro_goals', newGoals);
    });
  });

  // ── Templates ─────────────────────────────────────────────────────────────

  describe('templates', () => {
    const template: MealTemplate = {
      id: 'tpl1',
      name: 'High Protein',
      icon: 'barbell-outline',
      items: [makeFood('f1')],
    };

    beforeEach(() => {
      // Clear the template store key before each template test
      delete store['meal_templates'];
      (storageMock.get as jasmine.Spy).calls.reset();
      (storageMock.set as jasmine.Spy).calls.reset();
    });

    it('returns empty array when no templates exist', async () => {
      expect(await service.getTemplates()).toEqual([]);
    });

    it('saveTemplate() persists and getTemplates() retrieves it', async () => {
      await service.saveTemplate(template);
      const templates = await service.getTemplates();
      expect(templates.length).toBe(1);
      expect(templates[0].name).toBe('High Protein');
    });

    it('deleteTemplate() removes the correct template', async () => {
      await service.saveTemplate(template);
      await service.saveTemplate({ ...template, id: 'tpl2', name: 'Low Carb' });
      await service.deleteTemplate('tpl1');
      const templates = await service.getTemplates();
      expect(templates.length).toBe(1);
      expect(templates[0].id).toBe('tpl2');
    });

    it('renameTemplate() updates the name', async () => {
      await service.saveTemplate(template);
      await service.renameTemplate('tpl1', 'Renamed Template');
      const templates = await service.getTemplates();
      expect(templates[0].name).toBe('Renamed Template');
    });

    it('applyTemplate() adds a new meal from the template', async () => {
      await service.saveTemplate(template);
      await service.applyTemplate(TODAY, template);
      const meals = service.currentLog$.value!.meals;
      expect(meals.length).toBe(1);
      expect(meals[0].name).toBe('High Protein');
      expect(meals[0].items.length).toBe(1);
    });

    it('applyTemplate() gives each applied item a new id', async () => {
      await service.applyTemplate(TODAY, template);
      const appliedItem = service.currentLog$.value!.meals[0].items[0];
      expect(appliedItem.id).not.toBe('f1');
    });
  });

  // ── getLoggedDates ─────────────────────────────────────────────────────────

  describe('getLoggedDates()', () => {
    it('returns dates sorted newest first', async () => {
      store['daily_log_2025-01-01'] = {};
      store['daily_log_2025-03-15'] = {};
      store['daily_log_2025-02-10'] = {};
      const dates = await service.getLoggedDates();
      expect(dates).toEqual(['2025-03-15', '2025-02-10', '2025-01-01']);
    });

    it('returns an empty array when no logs exist', async () => {
      const dates = await service.getLoggedDates();
      expect(dates.length).toBe(0);
    });
  });
});
