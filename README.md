This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

final ,,,, back lazy loading
user specific add to cart stock error
ui card setting still pending ...

## Stripe sandbox setup

This project accepts Stripe sandbox keys only. Add these values to `.env` locally
and to the Vercel project environment when deploying a sandbox build:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Apply the payment schema migration and regenerate Prisma Client:

```bash
npx prisma migrate deploy
npx prisma generate
```

For local webhooks, install and authenticate Stripe CLI, then forward only the
events used by the application:

```bash
stripe login
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,payment_intent.processing,payment_intent.payment_failed,payment_intent.canceled \
  --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` value printed by `stripe listen` into
`STRIPE_WEBHOOK_SECRET`, then restart the development server. The CLI secret is
different from the signing secret for a webhook endpoint registered in Stripe.

For Vercel, register this HTTPS endpoint in Stripe sandbox mode:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

Use that endpoint's sandbox signing secret in the Vercel environment. Never
place `sk_test_...` or `whsec_...` values in browser code or source control.

- Keep carts non-reserving.
  - Reserve stock atomically when checkout starts.
  - Hold inventory until the Stripe Checkout Session succeeds or expires.
  - Release it after a failed/expired payment.
  - Keep the same unpaid order available for retry.
  - Re-reserve stock when Retry Payment is clicked.
  - Create a new PaymentAttempt, never a duplicate order.
  - Never accept payment unless that retry successfully reserves stock first.


Running Sneakers,Shoe,white,L,RT6-SNK-WHT-L,3499,18,sneakers.jpg 
