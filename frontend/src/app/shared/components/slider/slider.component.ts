import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-slider',
  styleUrl: './slider.component.css',
  templateUrl: './slider.component.html',
})
export class SliderComponent {
  /* --- datos --- */
  images: string[] = [
    'assets/imgs/slides/001.png',
    'assets/imgs/slides/002.png',
    'assets/imgs/slides/003.png',
    'assets/imgs/slides/004.png',
    'assets/imgs/slides/005.png',
    'assets/imgs/slides/006.png',
    'assets/imgs/slides/007.png',
    'assets/imgs/slides/008.png',
    'assets/imgs/slides/009.png',
  ];

  slideCount = this.images.length;

  /* --- estado --- */
  currentSlide = signal(0);
  autoplay = signal(true);

  constructor() {
    /* --- autoplay loop --- */
    effect(() => {
      const play = this.autoplay();
      if (!play) return;
      const sub = interval(5000).subscribe(() => this.next());
      return () => sub.unsubscribe();
    });
  }

  /* --- navegación --- */
  next() {
    this.currentSlide.update(x => (x + 1) % this.slideCount);
    // Se mantiene la sombra cuando se avanza
  }
  /* --- navegación --- */
  prev() {
    this.currentSlide.update(x => (x - 1 + this.slideCount) % this.slideCount);
    // Se mantiene la sombra cuando se retrocede
  }
  goTo(i: number) {
    this.currentSlide.set(i);
  }

  toggleAutoplay() {
    this.autoplay.update(x => !x);
  }
}
