"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateEntryItemAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ItemCalorieEditor({
  entryId,
  itemId,
  initialPortionLabel,
  initialFinalCalories,
}: {
  entryId: string;
  itemId: string;
  initialPortionLabel: string | null;
  initialFinalCalories: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [portionLabel, setPortionLabel] = useState(initialPortionLabel ?? "");
  const [finalCalories, setFinalCalories] = useState(String(initialFinalCalories));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          const result = await updateEntryItemAction({
            entryId,
            itemId,
            portionLabel: portionLabel.trim() || null,
            finalCalories: Number(finalCalories),
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
          <FieldLabel htmlFor={`${itemId}-portion`}>Portion</FieldLabel>
          <FieldContent>
            <Input
              id={`${itemId}-portion`}
              onChange={(event) => setPortionLabel(event.target.value)}
              value={portionLabel}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${itemId}-calories`}>Final calories</FieldLabel>
          <FieldContent>
            <Input
              id={`${itemId}-calories`}
              inputMode="numeric"
              onChange={(event) => setFinalCalories(event.target.value)}
              type="number"
              value={finalCalories}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? "Saving..." : "Save edit"}
      </Button>
    </form>
  );
}
