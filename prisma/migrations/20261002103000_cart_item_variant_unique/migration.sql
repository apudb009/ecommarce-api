-- DropIndex
DROP INDEX "CartItem_cartId_productId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key"
ON "CartItem"("cartId", "productId", "variantId");