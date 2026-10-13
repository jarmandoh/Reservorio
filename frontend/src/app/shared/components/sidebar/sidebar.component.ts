import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  template: `
    <nav class="sidebar bg-surface p-4">
      <ul class="space-y-2">
        @for (item of items; track item.link) {
          <li class="flex items-center gap-2">
            <a [routerLink]="item.link" class="text-sm text-on-surface-variant hover:text-primary">
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [
    `.sidebar { width: 200px; }
     a { text-decoration: none; }
    `],
})
export class SidebarComponent {
  @Input() items: { label: string; link: string }[] = [];
}
