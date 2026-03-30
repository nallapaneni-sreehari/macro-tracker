import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'today',
        loadChildren: () => import('../today/today.module').then(m => m.TodayPageModule)
      },
      {
        path: 'history',
        loadChildren: () => import('../history/history.module').then(m => m.HistoryPageModule)
      },
      {
        path: 'charts',
        loadChildren: () => import('../charts/charts.module').then(m => m.ChartsPageModule)
      },
      {
        path: 'goals',
        loadChildren: () => import('../goals/goals.module').then(m => m.GoalsPageModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('../settings/settings.module').then(m => m.SettingsPageModule)
      },
      {
        path: 'meal/:date/:mealId',
        loadChildren: () => import('../meal-detail/meal-detail.module').then(m => m.MealDetailPageModule)
      },
      {
        path: 'add-food/:date/:mealId',
        loadChildren: () => import('../add-food/add-food.module').then(m => m.AddFoodPageModule)
      },
      {
        path: 'add-food/:date/:mealId/:itemId',
        loadChildren: () => import('../add-food/add-food.module').then(m => m.AddFoodPageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/today',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/today',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
