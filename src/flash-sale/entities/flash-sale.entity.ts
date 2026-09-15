export interface FlashSale {
  id: number;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  bannerColor: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashSaleProduct {
  productId: number;
  price: number | null;
  saleId: number | null;
  saleName?: string;
  discountType?: string;
  discountValue?: number;
  endTime?: Date;
}
