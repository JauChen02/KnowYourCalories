"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateImageRetentionPreferenceAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export function ImageRetentionForm({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [retainImagesAfterAnalysis, setRetainImagesAfterAnalysis] =
    useState(initialValue);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          const result = await updateImageRetentionPreferenceAction({
            retainImagesAfterAnalysis,
          });

          if (result.ok) {
            toast.success(result.message);
            router.refresh();
            return;
          }

          toast.error(result.message);
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="retain-images-after-analysis">
            Keep meal images after analysis
          </FieldLabel>
          <FieldContent className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>
                {retainImagesAfterAnalysis
                  ? "Images stay attached to analyzed entries."
                  : "Images are deleted from Blob after successful analysis."}
              </span>
              <FieldDescription>
                Disabling retention keeps calorie data and AI JSON, but future analyzed
                entries will no longer keep their photo after analysis succeeds.
              </FieldDescription>
            </div>
            <Switch
              checked={retainImagesAfterAnalysis}
              id="retain-images-after-analysis"
              onCheckedChange={setRetainImagesAfterAnalysis}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <Button className="min-h-12" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save image setting"}
      </Button>
    </form>
  );
}
