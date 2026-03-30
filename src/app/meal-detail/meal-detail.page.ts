import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { MealService } from '../services/meal.service';
import {
  DailyLog,
  Meal,
  FoodItem,
  Macros,
  MealTemplate,
  calculateMealMacros,
  generateId,
} from '../models/nutrition.model';

@Component({
  selector: 'app-meal-detail',
  templateUrl: './meal-detail.page.html',
  styleUrls: ['./meal-detail.page.scss'],
  standalone: false,
})
export class MealDetailPage implements OnInit {
  date: string = '';
  mealId: string = '';
  meal: Meal | null = null;
  mealMacros: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mealService: MealService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit(): void {}

  async ionViewWillEnter(): Promise<void> {
    this.date = this.route.snapshot.paramMap.get('date') || '';
    this.mealId = this.route.snapshot.paramMap.get('mealId') || '';
    const loading = await this.loadingCtrl.create({ message: 'Loading...', duration: 5000 });
    await loading.present();
    await this.refresh();
    await loading.dismiss();
  }

  async refresh(): Promise<void> {
    const log = await this.mealService.loadDay(this.date);
    this.meal = log.meals.find((m) => m.id === this.mealId) || null;
    if (this.meal) {
      this.mealMacros = calculateMealMacros(this.meal);
    }
  }

  addFood(): void {
    this.router.navigate(['/tabs/add-food', this.date, this.mealId]);
  }

  async editItem(item: FoodItem): Promise<void> {
    this.router.navigate(['/tabs/add-food', this.date, this.mealId, item.id]);
  }

  async removeItem(item: FoodItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Remove Item',
      message: `Remove "${item.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await this.mealService.removeFoodItem(this.date, this.mealId, item.id);
            await this.refresh();
          },
        },
      ],
    });
    await alert.present();
  }

  async saveAsTemplate(): Promise<void> {
    if (!this.meal) return;
    const loading = await this.loadingCtrl.create({ message: 'Saving template...', duration: 5000 });
    await loading.present();
    const template: MealTemplate = {
      id: generateId(),
      name: this.meal.name,
      icon: this.meal.icon,
      items: [...this.meal.items],
    };
    await this.mealService.saveTemplate(template);
    await loading.dismiss();

    const alert = await this.alertCtrl.create({
      header: 'Saved!',
      message: `"${this.meal.name}" saved as a template for quick reuse.`,
      buttons: ['OK'],
    });
    await alert.present();
  }

  async toggleComplete(): Promise<void> {
    await this.mealService.toggleMealComplete(this.date, this.mealId);
    await this.refresh();
  }

  goBack(): void {
    this.router.navigate(['/tabs/today']);
  }
}
