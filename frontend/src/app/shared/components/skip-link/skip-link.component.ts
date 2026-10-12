import { Component } from '@angular/core';

@Component({
  selector: 'app-skip-link',
  template: `
    <a href="#main-content" class="skip-link" aria-label="Saltar al contenido principal">
      Salto al contenido
    </a>
  `,
  styles: []
})
export class SkipLinkComponent {}
