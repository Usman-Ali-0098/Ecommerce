-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('LEGACY', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'UNPAID', 'REQUIRES_ACTION', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeDefaultPaymentMethodId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "OrderPaymentMethod" NOT NULL DEFAULT 'LEGACY',
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- New orders use card checkout; historical rows retain their legacy state.
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'CARD';
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'pkr',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "failureCode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "stockReleasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE UNIQUE INDEX "PaymentAttempt_stripeCheckoutSessionId_key" ON "PaymentAttempt"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "PaymentAttempt_stripePaymentIntentId_key" ON "PaymentAttempt"("stripePaymentIntentId");
CREATE INDEX "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");
CREATE INDEX "PaymentAttempt_expiresAt_idx" ON "PaymentAttempt"("expiresAt");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
