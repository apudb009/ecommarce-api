-- DropIndex
DROP INDEX "CouponUse_couponId_userId_key";

-- CreateIndex
CREATE INDEX "CouponUse_couponId_idx" ON "CouponUse"("couponId");

-- CreateIndex
CREATE INDEX "CouponUse_userId_idx" ON "CouponUse"("userId");

-- CreateIndex
CREATE INDEX "CouponUse_couponId_userId_idx" ON "CouponUse"("couponId", "userId");
