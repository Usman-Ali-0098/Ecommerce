// Thin client for the storefront-jobs-service (FastAPI + Celery). Next.js
// still renders email HTML itself (it owns the React Email templates) and
// only hands the final {to, subject, html} over for dispatch.

export class JobsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobsServiceError";
  }
}

function jobsServiceUrl(path: string) {
  const base = process.env.FASTAPI_JOBS_URL;
  if (!base) {
    throw new JobsServiceError("FASTAPI_JOBS_URL is not configured.");
  }
  return new URL(path, base).toString();
}

function jobsServiceHeaders() {
  const secret = process.env.JOBS_API_SECRET;
  if (!secret) {
    throw new JobsServiceError("JOBS_API_SECRET is not configured.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };
}

type SendEmailJobParams = {
  to: string;
  subject: string;
  html: string;
  requestedBy?: number;
};

/** Enqueues an email send. Resolves with the JobRun id once FastAPI has
 * accepted the job (202) — the actual SMTP send happens asynchronously in a
 * Celery worker. Poll prisma.jobRun.findUnique({ where: { id: jobId } }) for
 * status/results rather than assuming success here. */
export async function sendEmailJob({
  to,
  subject,
  html,
  requestedBy,
}: SendEmailJobParams): Promise<{ jobId: string }> {
  const response = await fetch(jobsServiceUrl("/jobs/email"), {
    method: "POST",
    headers: jobsServiceHeaders(),
    body: JSON.stringify({ to, subject, html, requested_by: requestedBy }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new JobsServiceError(
      body?.detail ?? `Jobs service returned ${response.status} for /jobs/email.`,
    );
  }

  return response.json();
}

type ImportProduct = {
  name: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  images: Array<{
    url: string;
    publicId: string;
    colorId: string | null;
    position?: number;
    isPrimary: boolean;
  }>;
  variants: Array<{
    sku: string;
    price: number;
    stock: number;
    colorId: string | null;
    sizeId: string | null;
    imageUrl: string | null;
    imagePublicId: string | null;
  }>;
};

/** Enqueues a bulk product import — one JobRunItem per product, one Celery
 * task per product. Poll prisma.jobRun.findUnique({ where: { id: jobId },
 * include: { items: true } }) for per-product progress/results. */
export async function sendProductImportJob({
  products,
  requestedBy,
}: {
  products: ImportProduct[];
  requestedBy?: number;
}): Promise<{ jobId: string }> {
  const response = await fetch(jobsServiceUrl("/jobs/products/import"), {
    method: "POST",
    headers: jobsServiceHeaders(),
    body: JSON.stringify({ products, requested_by: requestedBy }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new JobsServiceError(
      body?.detail ?? `Jobs service returned ${response.status} for /jobs/products/import.`,
    );
  }

  return response.json();
}
