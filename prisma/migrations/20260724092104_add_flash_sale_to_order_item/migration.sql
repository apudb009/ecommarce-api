-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "flashSaleId" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "flashSaleId" INTEGER,
ADD COLUMN     "salePrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
