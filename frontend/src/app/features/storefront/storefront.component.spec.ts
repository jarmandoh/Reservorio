import { describe, expect, it } from 'vitest';
import { CatalogProduct } from '../../core/models/businesses.model';
import { createOrderMessage, createWhatsAppOrderUrl } from './storefront-order';

const coffee: CatalogProduct = {
  id: 'coffee',
  businessId: 'local-shop',
  name: 'Café de origen',
  description: 'Tueste local',
  category: 'Café',
  price: 18000,
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/coffee.jpg',
  imagePublicId: 'reservorio/local-shop/products/coffee',
  active: true,
};

describe('storefront order helpers', () => {
  it('creates a WhatsApp-ready order with quantities and total', () => {
    const message = createOrderMessage('Casa Verde', [{ product: coffee, quantity: 2 }], 36000);

    expect(message).toContain('Hola, quiero hacer este pedido en Casa Verde:');
    expect(message).toContain('2 x Café de origen');
    expect(message).toContain('Total estimado:');
  });

  it('normalizes the seller phone and URL-encodes the prefilled message', () => {
    const url = createWhatsAppOrderUrl('+57 300 123 4567', 'Quiero café & pan');

    expect(url).toContain('https://wa.me/573001234567?text=');
    expect(url).toContain(encodeURIComponent('Quiero café & pan'));
  });

  it('does not create a link for an invalid phone number', () => {
    expect(createWhatsAppOrderUrl('123', 'Hola')).toBeNull();
  });
});
