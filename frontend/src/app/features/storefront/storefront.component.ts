import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DEFAULT_CURRENCY, formatCurrency } from '../../core/config/currency';
import { ApiService } from '../../core/services/api.service';
import { Business, CatalogProduct } from '../../core/models/businesses.model';
import { createOrderMessage, createWhatsAppOrderUrl } from './storefront-order';

@Component({
  selector: 'app-storefront',
  imports: [CommonModule, RouterLink],
  templateUrl: './storefront.component.html',
  styleUrl: './storefront.component.css',
})
export class StorefrontComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly business = signal<Business | null>(null);
  readonly products = signal<CatalogProduct[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly cart = signal<Record<string, number>>({});
  readonly cartOpen = signal(false);
  readonly selectedCategory = signal('Todos');
  readonly currency = DEFAULT_CURRENCY;
  readonly formatCurrency = formatCurrency;

  readonly categories = computed(() => ['Todos', ...new Set(this.products().map(product => product.category).filter(Boolean))]);
  readonly visibleProducts = computed(() =>
    this.selectedCategory() === 'Todos'
      ? this.products()
      : this.products().filter(product => product.category === this.selectedCategory())
  );
  readonly cartLines = computed(() => {
    const quantities = this.cart();
    return this.products()
      .filter(product => quantities[product.id] > 0)
      .map(product => ({ product, quantity: quantities[product.id] }));
  });
  readonly cartCount = computed(() => Object.values(this.cart()).reduce((count, quantity) => count + quantity, 0));
  readonly cartTotal = computed(() =>
    this.cartLines().reduce((total, line) => total + line.product.price * line.quantity, 0)
  );

  ngOnInit(): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) {
      this.loading.set(false);
      this.errorMessage.set('No encontramos el negocio solicitado.');
      return;
    }

    forkJoin({
      business: this.api.getPublicStorefront(businessId),
      products: this.api.getCatalogProducts(businessId),
    }).subscribe({
      next: result => {
        this.business.set(result.business);
        this.products.set(result.products);
        this.loading.set(false);
      },
      error: error => {
        console.error('No se pudo cargar la tienda pública:', error);
        this.errorMessage.set(error?.error?.message ?? 'No pudimos cargar esta tienda. Intenta de nuevo.');
        this.loading.set(false);
      },
    });
  }

  addToCart(product: CatalogProduct): void {
    this.cart.update(current => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    this.cartOpen.set(true);
  }

  changeQuantity(productId: string, change: number): void {
    this.cart.update(current => {
      const quantity = (current[productId] ?? 0) + change;
      if (quantity <= 0) {
        const { [productId]: _removed, ...remaining } = current;
        return remaining;
      }
      return { ...current, [productId]: quantity };
    });
  }

  removeFromCart(productId: string): void {
    this.cart.update(current => {
      const { [productId]: _removed, ...remaining } = current;
      return remaining;
    });
  }

  whatsappOrderUrl(): string | null {
    const business = this.business();
    if (!business || !this.cartLines().length) return null;
    const message = createOrderMessage(business.name, this.cartLines(), this.cartTotal());
    return createWhatsAppOrderUrl(business.whatsapp ?? '', message);
  }

  whatsappContactUrl(phone: string): string | null {
    return createWhatsAppOrderUrl(phone, `Hola, quisiera más información sobre ${this.business()?.name ?? 'la tienda'}.`);
  }

  closeCart(): void {
    this.cartOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCart();
  }
}
