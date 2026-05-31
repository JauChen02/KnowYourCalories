import { PhotoAnalysisStatus } from "@/components/app/photo-analysis-status";

export const dynamic = "force-dynamic";

export default async function UploadAnalyzingPage({
  params,
}: {
  params: Promise<{
    entryId: string;
  }>;
}) {
  const { entryId } = await params;

  return (
    <div className="app-mobile-shell flex w-full flex-col gap-4">
      <PhotoAnalysisStatus entryId={entryId} />
    </div>
  );
}
