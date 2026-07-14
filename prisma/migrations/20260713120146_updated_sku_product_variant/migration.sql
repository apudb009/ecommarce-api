/*
  Warnings:

  - Made the column `sku` on table `ProductVariant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "sku" SET NOT NULL;
