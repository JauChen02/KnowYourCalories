import { AlertCircleIcon, CameraIcon } from "lucide-react";

import { appSetup } from "@/lib/env";
import { PhotoUploadFlow } from "@/components/app/photo-upload-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-4">
      {!appSetup.blobReady ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Photo upload is not configured yet</AlertTitle>
          <AlertDescription>
            KnowYourCalories can still save meal entries, but Android-friendly
            camera uploads need <code>BLOB_READ_WRITE_TOKEN</code> before they
            can be stored in Vercel Blob.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <CameraIcon />
          </div>
          <CardTitle>Add a meal</CardTitle>
          <CardDescription>
            Take a photo or choose one from your phone. KnowYourCalories will save
            the upload first, then start analysis without risking your entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUploadFlow blobReady={appSetup.blobReady} />
        </CardContent>
      </Card>
    </div>
  );
}
