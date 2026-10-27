import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SliderComponent } from '../../shared/components/slider/slider.component';

@Component({
  standalone: true,
  selector: 'app-presentaciones',
  templateUrl: './presentaciones.component.html',
  styleUrl: './presentaciones.component.css',
  imports: [CommonModule, SliderComponent],
})
export class PresentacionesComponent {}
