import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, IonicModule, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { HistoryPage } from './history.page';
import { MealService } from '../services/meal.service';
import { DailyLog, MacroGoals, MealTemplate, DEFAULT_GOALS } from '../models/nutrition.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

function makeLog(date: string, calories = 0): DailyLog {
  return {
    date, waterIntake: 0,
    meals: calories ? [{
      id: 'm1', name: 'Meal', icon: 'restaurant-outline', completed: false,
      items: [{
        id: 'f1', name: 'Food', servingSize: 100, servingUnit: 'g', autoFetched: false,
        macros: { calories, protein: 20, carbs: 25, fat: 5 },
      }],
    }] : [],
  };
}

const template: MealTemplate = {
  id: 'tpl1', name: 'High Protein', icon: 'barbell-outline', items: [],
};

function makeMealService() {
  return {
    goals$: new BehaviorSubject<MacroGoals>(DEFAULT_GOALS),
    getLoggedDates: jasmine.createSpy('getLoggedDates').and.returnValue(Promise.resolve(['2026-03-29', '2026-03-28'])),
    getTemplates: jasmine.createSpy('getTemplates').and.returnValue(Promise.resolve([template])),
    loadDay: jasmine.createSpy('loadDay').and.callFake((date: string) =>
      Promise.resolve(makeLog(date, 500))
    ),
    applyTemplate: jasmine.createSpy('applyTemplate').and.returnValue(Promise.resolve()),
    deleteTemplate: jasmine.createSpy('deleteTemplate').and.returnValue(Promise.resolve()),
    renameTemplate: jasmine.createSpy('renameTemplate').and.returnValue(Promise.resolve()),
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

describe('HistoryPage', () => {
  let component: HistoryPage;
  let fixture: ComponentFixture<HistoryPage>;
  let mealService: ReturnType<typeof makeMealService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mealService = makeMealService();
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [HistoryPage],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: MealService, useValue: mealService },
        { provide: Router, useValue: router },
        {
          provide: LoadingController,
          useValue: { create: jasmine.createSpy().and.returnValue(Promise.resolve(loadingMock)) },
        },
        {
          provide: AlertController,
          useValue: { create: jasmine.createSpy().and.returnValue(Promise.resolve(alertMock)) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ionViewWillEnter ──────────────────────────────────────────────────────

  describe('ionViewWillEnter()', () => {
    it('populates dates and marks isLoaded', async () => {
      await component.ionViewWillEnter();
      expect(component.dates).toEqual(['2026-03-29', '2026-03-28']);
      expect(component.isLoaded).toBeTrue();
    });

    it('loads a log for each date', async () => {
      await component.ionViewWillEnter();
      expect(mealService.loadDay).toHaveBeenCalledWith('2026-03-29');
      expect(mealService.loadDay).toHaveBeenCalledWith('2026-03-28');
    });

    it('loads templates', async () => {
      await component.ionViewWillEnter();
      expect(component.templates.length).toBe(1);
      expect(component.templates[0].name).toBe('High Protein');
    });
  });

  // ── getLog / getMacros ────────────────────────────────────────────────────

  describe('getLog() / getMacros()', () => {
    beforeEach(async () => {
      await component.ionViewWillEnter();
    });

    it('getLog returns the stored log for a date', () => {
      const log = component.getLog('2026-03-29');
      expect(log).toBeDefined();
      expect(log!.date).toBe('2026-03-29');
    });

    it('getLog returns undefined for an unknown date', () => {
      expect(component.getLog('1999-01-01')).toBeUndefined();
    });

    it('getMacros returns non-zero calories for a logged date', () => {
      const macros = component.getMacros('2026-03-29');
      expect(macros.calories).toBeGreaterThan(0);
    });

    it('getMacros returns zero calories for an unknown date', () => {
      expect(component.getMacros('1999-01-01').calories).toBe(0);
    });
  });

  // ── formatDate ────────────────────────────────────────────────────────────

  describe('formatDate()', () => {
    it('returns a non-empty human-readable string', () => {
      const result = component.formatDate('2026-03-15');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes the day number', () => {
      expect(component.formatDate('2026-03-15')).toContain('15');
    });
  });

  // ── isToday ───────────────────────────────────────────────────────────────

  describe('isToday()', () => {
    it('returns true for today\'s date', () => {
      expect(component.isToday(TODAY)).toBeTrue();
    });

    it('returns false for a past date', () => {
      expect(component.isToday('2020-01-01')).toBeFalse();
    });
  });

  // ── applyTemplate ─────────────────────────────────────────────────────────

  describe('applyTemplate()', () => {
    it('calls mealService.applyTemplate and navigates to Today', async () => {
      await component.applyTemplate(template);
      expect(mealService.applyTemplate).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/tabs/today']);
    });
  });

  // ── deleteTemplate ────────────────────────────────────────────────────────

  describe('deleteTemplate()', () => {
    it('calls mealService.deleteTemplate with the template id', async () => {
      await component.deleteTemplate(template);
      expect(mealService.deleteTemplate).toHaveBeenCalledWith('tpl1');
    });

    it('refreshes templates list after deletion', async () => {
      mealService.getTemplates.and.returnValue(Promise.resolve([]));
      await component.deleteTemplate(template);
      expect(component.templates).toEqual([]);
    });
  });
});
