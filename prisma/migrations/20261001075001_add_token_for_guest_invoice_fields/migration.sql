/*
  Warnings:

  - A unique constraint covering the columns `[downloadToken]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "downloadToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_downloadToken_key" ON "Invoice"("downloadToken");
