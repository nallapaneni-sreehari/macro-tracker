import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

import { MealDetailPage } from './meal-detail.page';
import { MealService } from '../services/meal.service';

describe('MealDetailPage', () => {
  let component: MealDetailPage;
  let fixture: ComponentFixture<MealDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MealDetailPage],
      imports: [RouterTestingModule, IonicModule.forRoot()],
      providers: [
        { provide: MealService, useValue: { loadDay: () => Promise.resolve({ meals: [] }) } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MealDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
