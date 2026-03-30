import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { MealService } from '../services/meal.service';
import {
  NutritionApiService,
  NutritionSearchResult,
} from '../services/nutrition-api.service';
import { AiService, AIParsedItem } from '../services/ai.service';
import { FoodItem, generateId, emptyMacros } from '../models/nutrition.model';

@Component({
  selector: 'app-add-food',
  templateUrl: './add-food.page.html',
  styleUrls: ['./add-food.page.scss'],
  standalone: false,
})
export class AddFoodPage implements OnInit {
  date: string = '';
  mealId: string = '';
  itemId: string = '';
  isEditing: boolean = false;

  segment: 'search' | 'manual' | 'ai' = 'search';

  // Search
  searchQuery: string = '';
  searchResults: NutritionSearchResult[] = [];
  isSearching: boolean = false;

  // AI Recipe
  recipeText: string = '';
  aiItems: AIParsedItem[] = [];
  isParsing: boolean = false;
  aiError: string = '';

  // Form fields
  name: string = '';
  servingSize: number = 100;
  servingUnit: string = 'g';
  calories: number = 0;
  protein: number = 0;
  carbs: number = 0;
  fat: number = 0;
  fiber: number = 0;
  sugar: number = 0;
  sodium: number = 0;
  autoFetched: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private mealService: MealService,
    private nutritionApi: NutritionApiService,
    private aiService: AiService
  ) {}

  ngOnInit(): void {}

  async ionViewWillEnter(): Promise<void> {
    this.date = this.route.snapshot.paramMap.get('date') || '';
    this.mealId = this.route.snapshot.paramMap.get('mealId') || '';
    this.itemId = this.route.snapshot.paramMap.get('itemId') || '';

    if (this.itemId) {
      this.isEditing = true;
      this.segment = 'manual';
      const log = await this.mealService.loadDay(this.date);
      const meal = log.meals.find((m) => m.id === this.mealId);
      const item = meal?.items.find((i) => i.id === this.itemId);
      if (item) {
        this.name = item.name;
        this.servingSize = item.servingSize;
        this.servingUnit = item.servingUnit;
        this.calories = item.macros.calories;
        this.protein = item.macros.protein;
        this.carbs = item.macros.carbs;
        this.fat = item.macros.fat;
        this.fiber = item.macros.fiber || 0;
        this.sugar = item.macros.sugar || 0;
        this.sodium = item.macros.sodium || 0;
        this.autoFetched = item.autoFetched;
      }
    } else {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.name = '';
    this.servingSize = 100;
    this.servingUnit = 'g';
    this.calories = 0;
    this.protein = 0;
    this.carbs = 0;
    this.fat = 0;
    this.fiber = 0;
    this.sugar = 0;
    this.sodium = 0;
    this.autoFetched = false;
  }

  async onSearch(): Promise<void> {
    if (!this.searchQuery || this.searchQuery.trim().length < 2) return;
    this.isSearching = true;
    this.searchResults = await this.nutritionApi.searchFood(this.searchQuery);
    this.isSearching = false;
  }

  selectResult(result: NutritionSearchResult): void {
    this.name = result.description;
    this.servingSize = result.servingSize || 100;
    this.servingUnit = result.servingSizeUnit || 'g';
    this.calories = result.macros.calories;
    this.protein = result.macros.protein;
    this.carbs = result.macros.carbs;
    this.fat = result.macros.fat;
    this.fiber = result.macros.fiber || 0;
    this.sugar = result.macros.sugar || 0;
    this.sodium = result.macros.sodium || 0;
    this.autoFetched = true;
    this.segment = 'manual'; // switch to manual so user can review & edit
  }

  async save(): Promise<void> {
    if (!this.name.trim()) return;

    const loading = await this.loadingCtrl.create({ message: 'Saving...', duration: 5000 });
    await loading.present();

    const item: FoodItem = {
      id: this.isEditing ? this.itemId : generateId(),
      name: this.name.trim(),
      servingSize: this.servingSize,
      servingUnit: this.servingUnit,
      macros: {
        calories: this.calories,
        protein: this.protein,
        carbs: this.carbs,
        fat: this.fat,
        fiber: this.fiber,
        sugar: this.sugar,
        sodium: this.sodium,
      },
      autoFetched: this.autoFetched,
    };

    if (this.isEditing) {
      await this.mealService.updateFoodItem(this.date, this.mealId, item);
    } else {
      await this.mealService.addFoodItem(this.date, this.mealId, item);
    }

    await loading.dismiss();

    this.router.navigate(['/tabs/meal', this.date, this.mealId]);
  }

  cancel(): void {
    this.router.navigate(['/tabs/meal', this.date, this.mealId]);
  }

  // ── AI Recipe Parsing ──

  async parseRecipe(): Promise<void> {
    if (!this.recipeText.trim()) return;
    this.isParsing = true;
    this.aiError = '';
    this.aiItems = [];
    try {
      this.aiItems = await this.aiService.parseRecipe(this.recipeText);
    } catch {
      this.aiError = 'Failed to parse recipe. Please try again.';
    }
    this.isParsing = false;
  }

  async acceptAllAiItems(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Adding items...', duration: 10000 });
    await loading.present();
    for (const item of this.aiItems) {
      await this.addAiItem(item);
    }
    await loading.dismiss();
    this.router.navigate(['/tabs/meal', this.date, this.mealId]);
  }

  async addAiItem(item: AIParsedItem): Promise<void> {
    const food: FoodItem = {
      id: generateId(),
      name: item.name,
      servingSize: item.servingSize,
      servingUnit: item.servingUnit,
      macros: {
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        sodium: item.sodium || 0,
      },
      autoFetched: true,
    };
    await this.mealService.addFoodItem(this.date, this.mealId, food);
  }

  editAiItem(item: AIParsedItem): void {
    this.name = item.name;
    this.servingSize = item.servingSize;
    this.servingUnit = item.servingUnit;
    this.calories = item.calories;
    this.protein = item.protein;
    this.carbs = item.carbs;
    this.fat = item.fat;
    this.fiber = item.fiber || 0;
    this.sugar = item.sugar || 0;
    this.sodium = item.sodium || 0;
    this.autoFetched = true;
    this.segment = 'manual';
  }

  removeAiItem(index: number): void {
    this.aiItems.splice(index, 1);
  }

  aiTotalCalories(): number {
    return this.aiItems.reduce((sum, i) => sum + i.calories, 0);
  }

  aiTotalProtein(): number {
    return this.aiItems.reduce((sum, i) => sum + i.protein, 0);
  }

  aiTotalCarbs(): number {
    return this.aiItems.reduce((sum, i) => sum + i.carbs, 0);
  }

  aiTotalFat(): number {
    return this.aiItems.reduce((sum, i) => sum + i.fat, 0);
  }
}
