import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { GoalsPage } from './goals.page';
import { MealService } from '../services/meal.service';
import { ToastService } from '../services/toast.service';
import { MacroGoals, DEFAULT_GOALS } from '../models/nutrition.model';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const goals$ = new BehaviorSubject<MacroGoals>({ ...DEFAULT_GOALS });

const mealServiceMock = {
  goals$,
  saveGoals: jasmine.createSpy('saveGoals').and.returnValue(Promise.resolve()),
};

const loadingMock = {
  present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve()),
};

const toastServiceMock = {
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
  warning: jasmine.createSpy('warning'),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('GoalsPage', () => {
  let component: GoalsPage;
  let fixture: ComponentFixture<GoalsPage>;

  beforeEach(async () => {
    mealServiceMock.saveGoals.calls.reset();
    goals$.next({ ...DEFAULT_GOALS });

    await TestBed.configureTestingModule({
      declarations: [GoalsPage],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: MealService, useValue: mealServiceMock },
        {
          provide: LoadingController,
          useValue: { create: jasmine.createSpy().and.returnValue(Promise.resolve(loadingMock)) },
        },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ionViewWillEnter ──────────────────────────────────────────────────────

  describe('ionViewWillEnter()', () => {
    it('loads the current goals from the service', () => {
      const custom: MacroGoals = { calories: 1800, protein: 130, carbs: 200, fat: 55, fiber: 25 };
      goals$.next(custom);
      component.ionViewWillEnter();
      expect(component.goals).toEqual(custom);
    });
  });

  // ── saveGoals ─────────────────────────────────────────────────────────────

  describe('saveGoals()', () => {
    it('calls mealService.saveGoals with current goals', fakeAsync(async () => {
      component.goals = { calories: 2200, protein: 160, carbs: 280, fat: 70, fiber: 30 };
      await component.saveGoals();
      tick();
      expect(mealServiceMock.saveGoals).toHaveBeenCalledWith(component.goals);
    }));

    it('shows a success toast after saving', fakeAsync(async () => {
      await component.saveGoals();
      tick();
      expect(toastMock.present).toHaveBeenCalled();
    }));
  });

  // ── default goals ─────────────────────────────────────────────────────────

  describe('default goal values', () => {
    it('calories default is positive', () => {
      expect(component.goals.calories).toBeGreaterThan(0);
    });

    it('protein default is positive', () => {
      expect(component.goals.protein).toBeGreaterThan(0);
    });

    it('carbs default is positive', () => {
      expect(component.goals.carbs).toBeGreaterThan(0);
    });

    it('fat default is positive', () => {
      expect(component.goals.fat).toBeGreaterThan(0);
    });
  });
});
