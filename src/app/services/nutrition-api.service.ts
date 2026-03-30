import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Macros } from '../models/nutrition.model';

export interface NutritionSearchResult {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  macros: Macros;
}

@Injectable({ providedIn: 'root' })
export class NutritionApiService {
  // USDA FoodData Central API — free, no auth required for demo key
  private readonly API_URL = 'https://api.nal.usda.gov/fdc/v1';
  private readonly API_KEY = 'DEMO_KEY'; // Replace with your own key for production

  constructor(private http: HttpClient) {}

  async searchFood(query: string): Promise<NutritionSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const params = new HttpParams()
      .set('api_key', this.API_KEY)
      .set('query', query.trim())
      .set('pageSize', '15')
      .set('dataType', 'Foundation,SR Legacy,Branded');

    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.API_URL}/foods/search`, { params })
      );

      return (response.foods || []).map((food: any) => this.mapFoodResult(food));
    } catch {
      console.error('USDA API search failed');
      return [];
    }
  }

  async getFoodDetails(fdcId: number): Promise<NutritionSearchResult | null> {
    const params = new HttpParams().set('api_key', this.API_KEY);

    try {
      const food: any = await firstValueFrom(
        this.http.get(`${this.API_URL}/food/${fdcId}`, { params })
      );
      return this.mapFoodResult(food);
    } catch {
      console.error('USDA API detail fetch failed');
      return null;
    }
  }

  private mapFoodResult(food: any): NutritionSearchResult {
    const nutrients = food.foodNutrients || [];
    const get = (id: number): number => {
      const n = nutrients.find(
        (n: any) => n.nutrientId === id || n?.nutrient?.id === id
      );
      return Math.round((n?.value ?? n?.amount ?? 0) * 10) / 10;
    };

    return {
      fdcId: food.fdcId,
      description: food.description || food.lowercaseDescription || 'Unknown',
      brandName: food.brandName || food.brandOwner,
      servingSize: food.servingSize || 100,
      servingSizeUnit: food.servingSizeUnit || 'g',
      macros: {
        calories: get(1008),
        protein: get(1003),
        carbs: get(1005),
        fat: get(1004),
        fiber: get(1079),
        sugar: get(2000) || get(1063),
        sodium: get(1093),
      },
    };
  }
}
