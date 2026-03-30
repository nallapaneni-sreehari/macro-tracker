import { Component } from '@angular/core';
import { MealService } from '../services/meal.service';
import { MacroGoals } from '../models/nutrition.model';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.page.html',
  styleUrls: ['./goals.page.scss'],
  standalone: false,
})
export class GoalsPage {
  goals: MacroGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 30 };

  constructor(private mealService: MealService, private toastCtrl: ToastController, private loadingCtrl: LoadingController) {}

  ionViewWillEnter(): void {
    this.goals = { ...this.mealService.goals$.value };
  }

  async saveGoals(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Saving...', duration: 5000 });
    await loading.present();
    await this.mealService.saveGoals(this.goals);
    await loading.dismiss();
    const toast = await this.toastCtrl.create({
      message: 'Goals saved!',
      duration: 1500,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }
}
