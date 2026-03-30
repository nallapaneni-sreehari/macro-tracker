import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AIParsedItem {
  name: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  async parseRecipe(text: string): Promise<AIParsedItem[]> {
    const res = await firstValueFrom(
      this.http.post<{ items: AIParsedItem[] }>(`${this.apiUrl}/parse-recipe`, { text })
    );
    return res.items;
  }
}
