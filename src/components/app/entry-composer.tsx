"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { createFoodEntryAction } from "@/app/actions";
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

type DraftItem = {
  name: string;
  portionLabel: string;
  estimatedCalories: string;
  finalCalories: string;
};

const mealOptions = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
  { label: "Drink", value: "drink" },
  { label: "Other", value: "other" },
] as const;

function isMealType(
  value: string
): value is (typeof mealOptions)[number]["value"] {
  return mealOptions.some((option) => option.value === value);
}

function createDateTimeLocalValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function EntryComposer({ blobReady }: { blobReady: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mealType, setMealType] = useState<(typeof mealOptions)[number]["value"]>(
    "lunch"
  );
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState(createDateTimeLocalValue());
  const [image, setImage] = useState<File | null>(null);
  const [items, setItems] = useState<DraftItem[]>([
    {
      name: "",
      portionLabel: "",
      estimatedCalories: "",
      finalCalories: "",
    },
  ]);

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function resetForm() {
    setMealType("lunch");
    setTitle("");
    setNotes("");
    setLoggedAt(createDateTimeLocalValue());
    setImage(null);
    setItems([
      {
        name: "",
        portionLabel: "",
        estimatedCalories: "",
        finalCalories: "",
      },
    ]);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          const formData = new FormData();
          formData.set("title", title);
          formData.set("mealType", mealType);
          formData.set("notes", notes);
          formData.set("loggedAt", loggedAt);
          formData.set("items", JSON.stringify(items));

          if (image) {
            formData.set("image", image);
          }

          const result = await createFoodEntryAction(formData);

          if (result.ok) {
            toast.success(result.message);
            resetForm();
            router.refresh();
            return;
          }

          toast.error(result.message);
        });
      }}
    >
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Meal basics</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="meal-title">Title</FieldLabel>
              <FieldContent>
                <Input
                  id="meal-title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Chicken burrito bowl"
                  required
                  value={title}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="logged-at">Logged time</FieldLabel>
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
                    <ToggleGroupItem key={option.value} value={option.value}>
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldContent>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Meal photo</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="meal-photo">Upload an image</FieldLabel>
              <FieldContent>
                <Input
                  accept="image/*"
                  capture="environment"
                  disabled={!blobReady}
                  id="meal-photo"
                  onChange={(event) =>
                    setImage(event.target.files?.item(0) ?? null)
                  }
                  type="file"
                />
                <FieldDescription>
                  {blobReady
                    ? "On Android, this opens your camera or photo picker. Images are stored in Vercel Blob and linked back to this meal."
                    : "Blob storage is not configured yet, so photo uploads are currently disabled."}
                </FieldDescription>
                {image ? (
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm text-muted-foreground">
                    Ready to upload <span className="font-medium text-foreground">{image.name}</span>
                  </div>
                ) : null}
              </FieldContent>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Item breakdown</FieldLegend>
          <FieldGroup>
            {items.map((item, index) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-3"
                key={`draft-item-${index}`}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`item-name-${index}`}>Food item</FieldLabel>
                    <FieldContent>
                      <Input
                        id={`item-name-${index}`}
                        onChange={(event) =>
                          updateItem(index, "name", event.target.value)
                        }
                        placeholder="Grilled chicken"
                        value={item.name}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`item-portion-${index}`}>Portion</FieldLabel>
                    <FieldContent>
                      <Input
                        id={`item-portion-${index}`}
                        onChange={(event) =>
                          updateItem(index, "portionLabel", event.target.value)
                        }
                        placeholder="140 g"
                        value={item.portionLabel}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`item-estimate-${index}`}>
                      Estimated calories
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id={`item-estimate-${index}`}
                        inputMode="numeric"
                        onChange={(event) =>
                          updateItem(index, "estimatedCalories", event.target.value)
                        }
                        placeholder="320"
                        type="number"
                        value={item.estimatedCalories}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`item-final-${index}`}>
                      Final calories
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id={`item-final-${index}`}
                        inputMode="numeric"
                        onChange={(event) =>
                          updateItem(index, "finalCalories", event.target.value)
                        }
                        placeholder="320"
                        type="number"
                        value={item.finalCalories}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
                <Button
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Remove item
                </Button>
              </div>
            ))}
            <Button
              size="lg"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  {
                    name: "",
                    portionLabel: "",
                    estimatedCalories: "",
                    finalCalories: "",
                  },
                ])
              }
              type="button"
              variant="outline"
            >
              <PlusIcon data-icon="inline-start" />
              Add another item
            </Button>
          </FieldGroup>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="meal-notes">Notes or context</FieldLabel>
          <FieldContent>
            <Textarea
              id="meal-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Restaurant name, ingredients, or anything you want to remember."
              rows={4}
              value={notes}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
      <Button className="min-h-12" disabled={pending} size="lg" type="submit">
        <CameraIcon data-icon="inline-start" />
        {pending ? "Saving meal..." : "Save meal entry"}
      </Button>
    </form>
  );
}
