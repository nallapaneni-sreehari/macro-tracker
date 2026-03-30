import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodayPage } from './today.page';
import { AstraPageModule } from '../astra/astra.module';

import { TodayPageRoutingModule } from './today-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TodayPageRoutingModule,
    AstraPageModule
  ],
  declarations: [TodayPage]
})
export class TodayPageModule {}
