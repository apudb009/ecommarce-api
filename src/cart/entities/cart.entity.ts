import { Prisma } from 'src/generated/prisma/client';

// type that matches the prisma cart include
export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            slug: true;
            price: true;
            stock: true;
            images: true;
            isActive: true;
            category: {
              select: { id: true; name: true };
            };
          };
        };
        variant: true;
      };
    };
  };
}>;

export type CartItemWithProduct = CartWithItems['items'][number];

export interface FormattedCartItem extends CartItemWithProduct {
  originalPrice: number;
  flashPrice: number | null;
  flashSaleId: number | null;
  flashSaleName?: string | null;
  flashEndTime?: Date | null;
  effectivePrice: number;
  isOnFlashSale: boolean;
  savings: number;
  subtotal: number;
}

export interface FormattedCart {
  id: number;
  userId: number;
  items: FormattedCartItem[];
  totalItems: number;
  totalAmount: number;
  totalSavings: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
  updatedAt: Date;
  discountAmount?: number;
  couponCode?: string;
}
