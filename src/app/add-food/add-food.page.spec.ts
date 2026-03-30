import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

import { AddFoodPage } from './add-food.page';
import { MealService } from '../services/meal.service';
import { NutritionApiService } from '../services/nutrition-api.service';
import { AiService } from '../services/ai.service';

describe('AddFoodPage', () => {
  let component: AddFoodPage;
  let fixture: ComponentFixture<AddFoodPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddFoodPage],
      imports: [RouterTestingModule, IonicModule.forRoot()],
      providers: [
        { provide: MealService, useValue: { loadDay: () => Promise.resolve({ meals: [] }) } },
        { provide: NutritionApiService, useValue: { search: () => Promise.resolve([]) } },
        { provide: AiService, useValue: { parseRecipe: () => Promise.resolve([]) } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddFoodPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
