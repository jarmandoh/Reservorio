import { DEFAULT_CURRENCY, formatCurrency } from '../../core/config/currency';
import { CatalogProduct } from '../../core/models/businesses.model';

export interface CartLine {
  product: CatalogProduct;
  quantity: number;
}

export function createOrderMessage(businessName: string, lines: CartLine[], total: number): string {
  const details = lines.map(
    ({ product, quantity }) =>
      `${quantity} x ${product.name} — ${formatCurrency(product.price * quantity, DEFAULT_CURRENCY)}`
  );
  return [
    `Hola, quiero hacer este pedido en ${businessName}:`,
    '',
    ...details,
    '',
    `Total estimado: ${formatCurrency(total, DEFAULT_CURRENCY)}`,
    '',
    'Quedo pendiente de confirmación. ¡Gracias!',
  ].join('\n');
}

export function createWhatsAppOrderUrl(phone: string, message: string): string | null {
  const number = phone.replace(/\D/g, '');
  if (number.length < 7 || number.length > 15) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
