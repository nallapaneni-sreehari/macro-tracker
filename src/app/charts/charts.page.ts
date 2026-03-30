import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { MealService } from '../services/meal.service';
import {
  DailyLog,
  MacroGoals,
  calculateDailyMacros,
  getTodayKey,
} from '../models/nutrition.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-charts',
  templateUrl: './charts.page.html',
  styleUrls: ['./charts.page.scss'],
  standalone: false,
})
export class ChartsPage implements AfterViewInit, OnDestroy {
  @ViewChild('calorieChart') calorieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('macroChart') macroChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('macroAvgChart') macroAvgChartRef!: ElementRef<HTMLCanvasElement>;

  range: '7' | '14' | '30' = '7';
  goals: MacroGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

  // Stats
  avgCalories = 0;
  avgProtein = 0;
  avgCarbs = 0;
  avgFat = 0;
  totalDaysLogged = 0;
  daysOnGoal = 0;

  private calorieChart: Chart | null = null;
  private macroChart: Chart | null = null;
  private macroAvgChart: Chart | null = null;
  private viewReady = false;

  constructor(
    private mealService: MealService,
    private loadingCtrl: LoadingController
  ) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  async ionViewWillEnter(): Promise<void> {
    this.goals = this.mealService.goals$.value;
    const loading = await this.loadingCtrl.create({ message: 'Loading charts...', duration: 10000 });
    await loading.present();
    await this.loadCharts();
    await loading.dismiss();
  }

  async onRangeChange(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Loading...', duration: 10000 });
    await loading.present();
    await this.loadCharts();
    await loading.dismiss();
  }

  private async loadCharts(): Promise<void> {
    const days = parseInt(this.range);
    const dates: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const logs: (DailyLog | null)[] = [];
    for (const date of dates) {
      try {
        const log = await this.mealService.loadDay(date);
        logs.push(log.meals.length > 0 ? log : null);
      } catch {
        logs.push(null);
      }
    }

    // Reload today so currentLog$ stays correct
    await this.mealService.loadDay(getTodayKey());

    const calories = logs.map(l => l ? calculateDailyMacros(l).calories : 0);
    const proteins = logs.map(l => l ? calculateDailyMacros(l).protein : 0);
    const carbs = logs.map(l => l ? calculateDailyMacros(l).carbs : 0);
    const fats = logs.map(l => l ? calculateDailyMacros(l).fat : 0);

    const labels = dates.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Compute stats
    const loggedDays = logs.filter(l => l !== null);
    this.totalDaysLogged = loggedDays.length;
    this.avgCalories = loggedDays.length > 0
      ? Math.round(calories.reduce((a, b) => a + b, 0) / loggedDays.length) : 0;
    this.avgProtein = loggedDays.length > 0
      ? Math.round(proteins.reduce((a, b) => a + b, 0) / loggedDays.length) : 0;
    this.avgCarbs = loggedDays.length > 0
      ? Math.round(carbs.reduce((a, b) => a + b, 0) / loggedDays.length) : 0;
    this.avgFat = loggedDays.length > 0
      ? Math.round(fats.reduce((a, b) => a + b, 0) / loggedDays.length) : 0;
    this.daysOnGoal = calories.filter(c => c >= this.goals.calories * 0.9 && c <= this.goals.calories * 1.1).length;

    if (!this.viewReady) return;

    this.destroyCharts();
    this.buildCalorieChart(labels, calories);
    this.buildMacroChart(labels, proteins, carbs, fats);
    this.buildMacroAvgChart();
  }

  private destroyCharts(): void {
    this.calorieChart?.destroy();
    this.macroChart?.destroy();
    this.macroAvgChart?.destroy();
    this.calorieChart = null;
    this.macroChart = null;
    this.macroAvgChart = null;
  }

  private getThemeColors() {
    const style = getComputedStyle(document.body);
    return {
      primary: style.getPropertyValue('--ion-color-primary').trim() || '#7FBF8F',
      danger: style.getPropertyValue('--ion-color-danger').trim() || '#E57373',
      success: style.getPropertyValue('--ion-color-success').trim() || '#66BB6A',
      warning: style.getPropertyValue('--ion-color-warning').trim() || '#FFB74D',
      tertiary: style.getPropertyValue('--ion-color-tertiary').trim() || '#5BA87A',
      medium: style.getPropertyValue('--ion-color-medium').trim() || '#6B7C72',
      text: style.getPropertyValue('--ion-text-color').trim() || '#2F3E34',
      border: style.getPropertyValue('--ion-border-color').trim() || '#e0e0e0',
    };
  }

  private buildCalorieChart(labels: string[], calories: number[]): void {
    const c = this.getThemeColors();
    const ctx = this.calorieChartRef.nativeElement.getContext('2d')!;
    this.calorieChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Calories',
            data: calories,
            backgroundColor: calories.map(cal =>
              cal >= this.goals.calories * 0.9 && cal <= this.goals.calories * 1.1
                ? c.success + 'CC' : cal > this.goals.calories * 1.1
                ? c.danger + 'CC' : c.primary + '99'
            ),
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} cal`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.medium, font: { size: 10 } },
          },
          y: {
            grid: { color: c.border + '66' },
            ticks: { color: c.medium, font: { size: 10 } },
          },
        },
      },
      plugins: [{
        id: 'goalLine',
        afterDatasetsDraw: (chart) => {
          const yScale = chart.scales['y'];
          const goalY = yScale.getPixelForValue(this.goals.calories);
          const ctx = chart.ctx;
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = c.danger;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(chart.chartArea.left, goalY);
          ctx.lineTo(chart.chartArea.right, goalY);
          ctx.stroke();
          ctx.restore();
        },
      }],
    });
  }

  private buildMacroChart(labels: string[], proteins: number[], carbs: number[], fats: number[]): void {
    const c = this.getThemeColors();
    const ctx = this.macroChartRef.nativeElement.getContext('2d')!;
    this.macroChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Protein',
            data: proteins,
            borderColor: c.success,
            backgroundColor: c.success + '22',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: c.success,
          },
          {
            label: 'Carbs',
            data: carbs,
            borderColor: c.warning,
            backgroundColor: c.warning + '22',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: c.warning,
          },
          {
            label: 'Fat',
            data: fats,
            borderColor: c.tertiary,
            backgroundColor: c.tertiary + '22',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: c.tertiary,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: c.text, usePointStyle: true, pointStyle: 'circle' },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}g`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.medium, font: { size: 10 } },
          },
          y: {
            grid: { color: c.border + '66' },
            ticks: { color: c.medium, font: { size: 10 }, callback: (v) => v + 'g' },
          },
        },
      },
    });
  }

  private buildMacroAvgChart(): void {
    const c = this.getThemeColors();
    const ctx = this.macroAvgChartRef.nativeElement.getContext('2d')!;
    this.macroAvgChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [
            this.avgProtein * 4,  // kcal from protein
            this.avgCarbs * 4,    // kcal from carbs
            this.avgFat * 9,      // kcal from fat
          ],
          backgroundColor: [c.success + 'CC', c.warning + 'CC', c.tertiary + 'CC'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: c.text, usePointStyle: true, pointStyle: 'circle', padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return `${ctx.label}: ${ctx.parsed} kcal (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}
