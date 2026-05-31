"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CameraIcon,
  GalleryHorizontalEndIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { createPendingPhotoEntryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const mealOptions = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
  { label: "Drink", value: "drink" },
  { label: "Other", value: "other" },
] as const;

type MealType = (typeof mealOptions)[number]["value"];

function isMealType(value: string): value is MealType {
  return mealOptions.some((option) => option.value === value);
}

function createDateTimeLocalValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("We couldn't read that image."));
    };

    image.src = objectUrl;
  });
}

async function compressImageForUpload(file: File) {
  if (typeof window === "undefined") {
    return file;
  }

  const image = await loadImage(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image compression is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) {
          resolve(value);
          return;
        }

        reject(new Error("We couldn't compress that image."));
      },
      "image/jpeg",
      0.82
    );
  });

  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "") || "meal-photo"}.jpg`,
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    }
  );
}

export function PhotoUploadFlow({ blobReady }: { blobReady: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState(createDateTimeLocalValue());
  const [image, setImage] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading" | "analyzing">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Auto-open camera on mobile when page loads
  useEffect(() => {
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile && blobReady && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, [blobReady]);

  const phaseMessage =
    phase === "compressing"
      ? "Preparing your photo for upload..."
      : phase === "uploading"
        ? "Uploading your photo safely..."
        : phase === "analyzing"
          ? "Starting analysis for your entry..."
          : "";

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImage(event.target.files?.item(0) ?? null);
    // Reset so the same file can be re-selected
    event.target.value = "";
  }

  return (
    <>
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);

          startTransition(async () => {
            try {
              if (!image) {
                throw new Error("Take a photo or choose an image first.");
              }

              setPhase("compressing");
              const compressedImage = await compressImageForUpload(image);
              setPhase("uploading");

              const formData = new FormData();
              formData.set("title", title);
              formData.set("mealType", mealType);
              formData.set("notes", notes);
              formData.set("loggedAt", loggedAt);
              formData.set("image", compressedImage);

              const result = await createPendingPhotoEntryAction(formData);

              if (!result.ok || !result.entryId) {
                throw new Error(result.message);
              }

              setPhase("analyzing");
              toast.success(result.message);
              router.push(`/upload/analyzing/${result.entryId}`);
              router.refresh();
            } catch (error) {
              setPhase("idle");
              const message =
                error instanceof Error ? error.message : "Unable to upload that photo.";
              setErrorMessage(message);
              toast.error(message);
            }
          });
        }}
      >
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={!blobReady || pending}
          id="meal-photo-camera"
          onChange={handleFileChange}
          type="file"
        />
        <input
          ref={galleryInputRef}
          accept="image/*"
          className="sr-only"
          disabled={!blobReady || pending}
          id="meal-photo-gallery"
          onChange={handleFileChange}
          type="file"
        />

        <FieldGroup>
          <FieldSet>
            <FieldLegend>Photo</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldContent>
                  {previewUrl ? (
                    <div className="flex flex-col gap-3">
                      <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/80">
                        <Image
                          alt="Meal preview"
                          className="h-64 w-full object-cover"
                          height={512}
                          src={previewUrl}
                          unoptimized
                          width={512}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          disabled={!blobReady || pending}
                          onClick={() => cameraInputRef.current?.click()}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <CameraIcon className="size-4" />
                          Retake
                        </Button>
                        <Button
                          disabled={!blobReady || pending}
                          onClick={() => galleryInputRef.current?.click()}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <GalleryHorizontalEndIcon className="size-4" />
                          Change
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        className="flex min-h-52 w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 text-center transition-colors hover:border-primary/70 hover:bg-primary/10 disabled:opacity-50"
                        disabled={!blobReady || pending}
                        onClick={() => cameraInputRef.current?.click()}
                        type="button"
                      >
                        <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-primary/12 text-primary">
                          <CameraIcon className="size-8" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-semibold text-foreground">Take a photo</span>
                          <span className="text-sm text-muted-foreground">Opens your camera</span>
                        </div>
                      </button>
                      <Button
                        className="w-full"
                        disabled={!blobReady || pending}
                        onClick={() => galleryInputRef.current?.click()}
                        type="button"
                        variant="outline"
                      >
                        <GalleryHorizontalEndIcon className="size-4" />
                        Choose from gallery
                      </Button>
                    </div>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Details</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="meal-title">Short title</FieldLabel>
                <FieldContent>
                  <Input
                    id="meal-title"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Iced latte"
                    value={title}
                  />
                  <FieldDescription>
                    Optional — defaults to &ldquo;Photo meal&rdquo; if skipped.
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="logged-at">When did you have it?</FieldLabel>
                <FieldContent>
                  <Input
                    id="logged-at"
                    onChange={(event) => setLoggedAt(event.target.value)}
                    required
                    type="datetime-local"
                    value={loggedAt}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Meal type</FieldLabel>
                <FieldContent>
                  <ToggleGroup
                    onValueChange={(value) => {
                      if (value[0] && isMealType(value[0])) {
                        setMealType(value[0]);
                      }
                    }}
                    value={[mealType]}
                  >
                    {mealOptions.map((option) => (
                      <ToggleGroupItem
                        className="min-h-11 flex-1 px-2"
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="meal-notes">Notes</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="meal-notes"
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Brand, restaurant, or ingredients."
                    rows={3}
                    value={notes}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <Button className="min-h-12" disabled={!blobReady || pending} size="lg" type="submit">
          <CameraIcon data-icon="inline-start" />
          {pending ? "Working..." : "Upload & analyze"}
        </Button>

        {!blobReady ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            Photo uploads are turned off until <code className="mx-0.5">BLOB_READ_WRITE_TOKEN</code> is configured.
          </div>
        ) : null}
      </form>

      {phase !== "idle" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/92 px-6 backdrop-blur-md">
          <div className="app-mobile-shell">
            <div className="glass-card rounded-[2rem] border border-white/60 p-6 shadow-2xl">
              <div className="mb-4 flex size-14 items-center justify-center rounded-3xl bg-primary/12 text-primary">
                {phase === "compressing" ? (
                  <RefreshCwIcon className="size-6 animate-spin" />
                ) : (
                  <Loader2Icon className="size-6 animate-spin" />
                )}
              </div>
              <div className="brand-wordmark text-primary">KnowYourCalories</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Analyzing your meal photo
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{phaseMessage}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
