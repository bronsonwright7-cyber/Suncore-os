import { notFound } from "next/navigation";
import { JobForm } from "@/components/jobs/job-form";
import { getJob, listActiveJobTypes, listActiveCrewsForFilter } from "@/server/jobs/queries";
import { listActivePartnersForSelect } from "@/server/partners/queries";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, jobTypes, partners, crews] = await Promise.all([
    getJob(id),
    listActiveJobTypes(),
    listActivePartnersForSelect(),
    listActiveCrewsForFilter(),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Edit Job #{job.job_number}</h1>
      </div>
      <JobForm job={job} jobTypes={jobTypes} partners={partners} crews={crews} />
    </div>
  );
}
