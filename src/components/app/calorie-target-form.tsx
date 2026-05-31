"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateCalorieTargetAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const goalOptions = [
  {
    value: "cutting",
    label: "Cutting",
    description: "Eat a bit less to lose weight.",
  },
  {
    value: "maintaining",
    label: "Maintaining",
    description: "Stay around your current weight.",
  },
  {
    value: "bulking",
    label: "Bulking",
    description: "Eat a bit more to gain weight.",
  },
] as const;

type GoalType = (typeof goalOptions)[number]["value"];

function isGoalType(value: string): value is GoalType {
  return goalOptions.some((option) => option.value === value);
}

export function CalorieTargetForm({
  initialTarget,
  initialGoalType = "maintaining",
  redirectTo,
  submitLabel = "Save target",
  titleDescription,
}: {
  initialTarget: number;
  initialGoalType?: GoalType;
  redirectTo?: string;
  submitLabel?: string;
  titleDescription?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState(String(initialTarget));
  const [goalType, setGoalType] = useState<GoalType>(initialGoalType);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          const result = await updateCalorieTargetAction({
            dailyCalorieTarget: Number(target),
            goalType,
          });

          if (result.ok) {
            toast.success(result.message);

            if (redirectTo) {
              router.push(redirectTo);
              router.refresh();
              return;
            }

            router.refresh();
            return;
          }

          toast.error(result.message);
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="daily-target">Daily calorie target</FieldLabel>
          <FieldContent>
            <Input
              id="daily-target"
              inputMode="numeric"
              min={100}
              onChange={(event) => setTarget(event.target.value)}
              required
              type="number"
              value={target}
            />
            <FieldDescription>
              Pick a simple daily number to aim for.
            </FieldDescription>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Goal type</FieldLabel>
          <FieldContent>
            <ToggleGroup
              onValueChange={(value) => {
                if (value[0] && isGoalType(value[0])) {
                  setGoalType(value[0]);
                }
              }}
              value={[goalType]}
            >
              {goalOptions.map((option) => (
                <ToggleGroupItem
                  className="min-h-12 flex-1 px-3"
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              {
                goalOptions.find((option) => option.value === goalType)
                  ?.description
              }
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>

      {titleDescription ? (
        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
          {titleDescription}
        </div>
      ) : null}

      <Button className="min-h-12" disabled={pending} type="submit">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
