import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule, LoadingController, ModalController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

import { TodayPage } from './today.page';
import { AstraPageModule } from '../astra/astra.module';
import { MealService } from '../services/meal.service';
import { DailyLog, MacroGoals, DEFAULT_GOALS, Meal, Macros } from '../models/nutrition.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

function makeLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return { date: TODAY, meals: [], waterIntake: 0, ...overrides };
}

function makeMealService() {
  const currentLog$ = new BehaviorSubject<DailyLog | null>(makeLog());
  const goals$ = new BehaviorSubject<MacroGoals>(DEFAULT_GOALS);
  return {
    currentLog$,
    goals$,
    loadDay: jasmine.createSpy('loadDay').and.callFake((date: string) => {
      const l = makeLog({ date });
      currentLog$.next(l);
      return Promise.resolve(l);
    }),
    addMeal: jasmine.createSpy('addMeal').and.returnValue(Promise.resolve()),
    removeMeal: jasmine.createSpy('removeMeal').and.returnValue(Promise.resolve()),
    toggleMealComplete: jasmine.createSpy('toggleMealComplete').and.returnValue(Promise.resolve()),
    updateWater: jasmine.createSpy('updateWater').and.returnValue(Promise.resolve()),
    getTemplates: jasmine.createSpy('getTemplates').and.returnValue(Promise.resolve([])),
    applyTemplate: jasmine.createSpy('applyTemplate').and.returnValue(Promise.resolve()),
  };
}

const loadingMock = {
  present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve()),
};

const alertMock = {
  present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TodayPage', () => {
  let component: TodayPage;
  let fixture: ComponentFixture<TodayPage>;
  let mealService: ReturnType<typeof makeMealService>;

  beforeEach(async () => {
    mealService = makeMealService();

    await TestBed.configureTestingModule({
      declarations: [TodayPage],
      imports: [IonicModule.forRoot(), FormsModule, AstraPageModule],
      providers: [
        { provide: MealService, useValue: mealService },
        {
          provide: LoadingController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(loadingMock)) },
        },
        {
          provide: AlertController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(alertMock)) },
        },
        {
          provide: ModalController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve({ present: jasmine.createSpy() })) },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodayPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── isToday ──────────────────────────────────────────────────────────────

  describe('isToday getter', () => {
    it('returns true when selectedDate is today', () => {
      component.selectedDate = TODAY;
      expect(component.isToday).toBeTrue();
    });

    it('returns false for a past date', () => {
      component.selectedDate = '2020-01-01';
      expect(component.isToday).toBeFalse();
    });
  });

  // ── macroPercent ─────────────────────────────────────────────────────────

  describe('macroPercent()', () => {
    it('calculates percentage correctly', () => {
      expect(component.macroPercent(100, 200)).toBe(50);
    });

    it('caps at 100 when current exceeds goal', () => {
      expect(component.macroPercent(250, 200)).toBe(100);
    });

    it('returns 0 when goal is 0', () => {
      expect(component.macroPercent(50, 0)).toBe(0);
    });

    it('returns 0 when current is 0', () => {
      expect(component.macroPercent(0, 200)).toBe(0);
    });
  });

  // ── goDay ────────────────────────────────────────────────────────────────

  describe('goDay()', () => {
    it('moves to the previous day with offset -1', () => {
      component.selectedDate = '2026-03-15';
      component.goDay(-1);
      expect(component.selectedDate).toBe('2026-03-14');
    });

    it('moves to the next day with offset +1', () => {
      component.selectedDate = '2026-03-15';
      component.goDay(1);
      expect(component.selectedDate).toBe('2026-03-16');
    });

    it('calls loadDay after navigation', fakeAsync(() => {
      component.selectedDate = '2026-03-15';
      component.goDay(1);
      tick(100);
      expect(mealService.loadDay).toHaveBeenCalled();
    }));
  });

  // ── meal counts ───────────────────────────────────────────────────────────

  describe('meal counts', () => {
    beforeEach(() => {
      const meals: Meal[] = [
        { id: 'm1', name: 'Breakfast', icon: 'sunny-outline',      items: [], completed: true  },
        { id: 'm2', name: 'Lunch',     icon: 'restaurant-outline', items: [], completed: false },
        { id: 'm3', name: 'Dinner',    icon: 'moon-outline',       items: [], completed: true  },
      ];
      mealService.currentLog$.next(makeLog({ meals }));
      component.log = mealService.currentLog$.value;
    });

    it('completedMeals returns count of completed meals', () => {
      expect(component.completedMeals).toBe(2);
    });

    it('totalMeals returns total number of meals', () => {
      expect(component.totalMeals).toBe(3);
    });
  });

  // ── getMealMacros ─────────────────────────────────────────────────────────

  describe('getMealMacros()', () => {
    it('returns zero macros for an empty meal', () => {
      const meal: Meal = { id: 'm1', name: 'Empty', icon: 'sunny-outline', items: [], completed: false };
      expect(component.getMealMacros(meal).calories).toBe(0);
    });

    it('returns summed macros for a meal with items', () => {
      const meal: Meal = {
        id: 'm1', name: 'Lunch', icon: 'restaurant-outline', completed: false,
        items: [{
          id: 'f1', name: 'Chicken', servingSize: 100, servingUnit: 'g', autoFetched: false,
          macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        }],
      };
      const macros = component.getMealMacros(meal);
      expect(macros.calories).toBe(165);
      expect(macros.protein).toBe(31);
    });
  });

  // ── reactive subscriptions ────────────────────────────────────────────────

  describe('reactive data', () => {
    it('updates goals when goals$ emits', () => {
      const newGoals: MacroGoals = { calories: 1800, protein: 130, carbs: 200, fat: 55 };
      mealService.goals$.next(newGoals);
      expect(component.goals).toEqual(newGoals);
    });

    it('updates dailyMacros when currentLog$ emits a log with items', () => {
      const log = makeLog({
        meals: [{
          id: 'm1', name: 'Breakfast', icon: 'sunny-outline', completed: false,
          items: [{
            id: 'f1', name: 'Oats', servingSize: 100, servingUnit: 'g', autoFetched: false,
            macros: { calories: 350, protein: 12, carbs: 60, fat: 6 },
          }],
        }],
      });
      mealService.currentLog$.next(log);
      expect(component.dailyMacros.calories).toBe(350);
    });
  });
});
