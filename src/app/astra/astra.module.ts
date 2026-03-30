import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AstraPage } from './astra.page';
import { AstraFormatPipe } from './astra-format.pipe';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [AstraPage, AstraFormatPipe],
  exports: [AstraPage],
})
export class AstraPageModule {}
