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

// email sending job

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




// Enqueue a CSV event that Next.js has already persisted in JobRun. The
// worker receives only the durable event ID and reads the CSV from storage.
export async function sendBulkCsvImportJob({
  jobRunId,
}: {
  jobRunId: string;
}): Promise<{ jobId: string; taskId: string | null; status: string }> {
  const response = await fetch(jobsServiceUrl("/jobs/bulk-upload"), {
    method: "POST",
    headers: jobsServiceHeaders(),
    body: JSON.stringify({ jobRunId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new JobsServiceError(
      body?.detail ?? `Jobs service returned ${response.status} for /jobs/bulk-upload.`,
    );
  }

  return response.json();
}


// chatbot knowledge reindex job
export async function sendKnowledgeReindexJob({
  requestedBy,
}: {
  requestedBy?: number;
} = {}): Promise<{ jobId: string; sourceCount: number }> {
  const response = await fetch(jobsServiceUrl("/jobs/knowledge/reindex"), {
    method: "POST",
    headers: jobsServiceHeaders(),
    body: JSON.stringify({ requested_by: requestedBy }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new JobsServiceError(
      body?.detail ?? `Jobs service returned ${response.status} for /jobs/knowledge/reindex.`,
    );
  }

  return response.json();
}
