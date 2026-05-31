"use client";

import Image from "next/image";
import { format } from "date-fns";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  acceptFollowUpRevisionAction,
  addFollowUpAction,
  rejectFollowUpRevisionAction,
  saveMealVerificationAction,
} from "@/app/actions";
import type { MealVerificationData } from "@/lib/meal-verification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type DraftItem = {
  id?: string;
  name: string;
  quantityEstimate: string;
  finalCalories: string;
  aiName: string | null;
  aiQuantityEstimate: string | null;
  aiCalories: number | null;
  confidence: number | null;
  reasoning: string | null;
};

function formatCalories(value: number | null) {
  if (value == null) {
    return "Not available";
  }

  return `${new Intl.NumberFormat("en-US").format(Math.abs(value))} cal`;
}

function formatConfidence(value: number | null) {
  if (value == null) {
    return "Not available";
  }

  return `${value}% confidence`;
}

function formatFollowUpConfidence(value: number | null) {
  if (value == null) {
    return "Not available";
  }

  return `${Math.max(0, Math.min(100, Math.round(value * 100)))}% confidence`;
}

function createDraftItems(entry: MealVerificationData): DraftItem[] {
  return entry.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantityEstimate: item.quantityEstimate ?? "",
    finalCalories: String(item.finalCalories),
    aiName: item.aiName,
    aiQuantityEstimate: item.aiQuantityEstimate,
    aiCalories: item.aiCalories,
    confidence: item.confidence,
    reasoning: item.reasoning,
  }));
}

function createDraftItemsFromFollowUp(
  result: NonNullable<MealVerificationData["followUps"][number]["result"]>
): DraftItem[] {
  return result.items.map((item) => ({
    name: item.name,
    quantityEstimate: item.quantityEstimate,
    finalCalories: String(Math.max(0, Math.round(item.kcal))),
    aiName: item.name,
    aiQuantityEstimate: item.quantityEstimate,
    aiCalories: Math.max(0, Math.round(item.kcal)),
    confidence: Math.max(0, Math.min(100, Math.round(item.confidence * 100))),
    reasoning: item.reasoning,
  }));
}

function getFollowUpBadgeVariant(status: string) {
  if (status === "accepted") {
    return "default";
  }

  if (status === "rejected" || status === "failed") {
    return "outline";
  }

  return "secondary";
}

export function MealVerificationScreen({ entry }: { entry: MealVerificationData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<DraftItem[]>(() => createDraftItems(entry));
  const [correctionMessage, setCorrectionMessage] = useState("");
  const hasSavedUserEdits =
    entry.userTotalKcal !== null ||
    entry.items.some(
      (item) =>
        item.userName !== null ||
        item.userQuantityEstimate !== null ||
        item.userCalories !== null
    );

  const totalCalories = items.reduce((sum, item) => {
    const nextValue = Number(item.finalCalories);
    return sum + (Number.isFinite(nextValue) ? Math.max(0, Math.round(nextValue)) : 0);
  }, 0);
  const hasUnsavedDraftChanges = totalCalories !== entry.finalTotalKcal;

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        name: "",
        quantityEstimate: "",
        finalCalories: "0",
        aiName: null,
        aiQuantityEstimate: null,
        aiCalories: null,
        confidence: null,
        reasoning: null,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function submitVerification(confirm: boolean) {
    startTransition(async () => {
      const result = await saveMealVerificationAction({
        entryId: entry.id,
        confirm,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantityEstimate: item.quantityEstimate || null,
          finalCalories: Number(item.finalCalories),
        })),
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function submitCorrection() {
    startTransition(async () => {
      const result = await addFollowUpAction({
        entryId: entry.id,
        message: correctionMessage,
      });

      if (result.ok) {
        toast.success(result.message);
        setCorrectionMessage("");
        router.refresh();
        return;
      }

      toast.error(result.message);
      router.refresh();
    });
  }

  function loadFollowUpIntoEditor(followUp: MealVerificationData["followUps"][number]) {
    if (!followUp.result) {
      return;
    }

    setItems(createDraftItemsFromFollowUp(followUp.result));
    toast.success("Revised result loaded into the editor. Save or confirm when it looks right.");
  }

  function acceptFollowUp(followUpId: string) {
    startTransition(async () => {
      const result = await acceptFollowUpRevisionAction({
        entryId: entry.id,
        followUpId,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function rejectFollowUp(followUpId: string) {
    startTransition(async () => {
      const result = await rejectFollowUpRevisionAction({
        entryId: entry.id,
        followUpId,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="glass-card border border-white/50 shadow-lg">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Badge className="w-fit" variant="secondary">
                Food entry details
              </Badge>
              <CardTitle>{entry.title}</CardTitle>
              <CardDescription>
                {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)} |{" "}
                {format(entry.loggedAt, "EEE, h:mm a")}
              </CardDescription>
            </div>
            <Badge variant={entry.status === "confirmed" ? "default" : "outline"}>
              {entry.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertCircleIcon />
            <AlertTitle>AI calorie estimates are only estimates</AlertTitle>
            <AlertDescription>
              These numbers are for general tracking only. They are not medical advice,
              nutrition advice, or a precise lab measurement.
            </AlertDescription>
          </Alert>

          {entry.warning ? (
            <Alert>
              <AlertCircleIcon />
              <AlertTitle>AI warning</AlertTitle>
              <AlertDescription>{entry.warning}</AlertDescription>
            </Alert>
          ) : null}

          {entry.imageUrl ? (
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/80">
              <Image
                alt={entry.title}
                className="h-72 w-full object-cover"
                height={720}
                src={entry.imageUrl}
                width={720}
              />
            </div>
          ) : (
            <Empty className="border border-dashed border-border/70 bg-background/60">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircleIcon />
                </EmptyMedia>
                <EmptyTitle>No meal photo saved</EmptyTitle>
                <EmptyDescription>
                  This entry can still be reviewed and corrected manually.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Original AI estimate</div>
              <div className="mt-1 text-2xl font-semibold">
                {formatCalories(entry.aiTotalKcal)}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">User-edited total</div>
              <div className="mt-1 text-2xl font-semibold">
                {entry.userTotalKcal != null
                  ? formatCalories(entry.userTotalKcal)
                  : "No saved edits yet"}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Final saved calories</div>
              <div className="mt-1 text-2xl font-semibold">
                {formatCalories(entry.finalTotalKcal)}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="text-sm text-muted-foreground">Current editor total</div>
              <div className="mt-1 text-2xl font-semibold">
                {formatCalories(totalCalories)}
              </div>
            </div>
          </div>

          {hasUnsavedDraftChanges ? (
            <Alert>
              <AlertCircleIcon />
              <AlertTitle>Unsaved calorie changes</AlertTitle>
              <AlertDescription>
                Your editor total is {formatCalories(totalCalories)}, but the saved final total is still{" "}
                {formatCalories(entry.finalTotalKcal)} until you save or confirm this meal.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              Your current editor total matches the saved final total used by the dashboard and history.
            </div>
          )}

          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="text-sm text-muted-foreground">AI estimate confidence</div>
            <div className="mt-1 text-2xl font-semibold">
              {formatConfidence(entry.confidence)}
            </div>
          </div>

          {entry.aiMealTitle || entry.aiModel || entry.aiPromptVersion ? (
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              {entry.aiMealTitle ? <div>AI title: {entry.aiMealTitle}</div> : null}
              {entry.aiModel ? <div>Model: {entry.aiModel}</div> : null}
              {entry.aiPromptVersion ? <div>Prompt version: {entry.aiPromptVersion}</div> : null}
            </div>
          ) : null}

          {entry.notes ? (
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              {entry.notes}
            </div>
          ) : null}

          {hasSavedUserEdits ? (
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              This entry includes saved user edits. Final calories are what count toward daily totals.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <Card className="glass-card border border-white/50 shadow-lg">
          <CardHeader>
            <CardTitle>Food items</CardTitle>
            <CardDescription>
              Review the itemized breakdown, then adjust names, quantities, and calories if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {items.length ? (
              items.map((item, index) => (
                <Card className="border border-border/70 bg-background/70" key={item.id ?? `new-${index}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <CardTitle className="text-base">Item {index + 1}</CardTitle>
                        <CardDescription>
                          {item.aiCalories != null
                            ? `AI estimated ${formatCalories(item.aiCalories)}`
                            : "Added manually during verification"}
                        </CardDescription>
                      </div>
                      <Button
                        disabled={pending || items.length === 1}
                        onClick={() => removeItem(index)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <FieldSet>
                      <FieldLegend>Edit item</FieldLegend>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor={`item-name-${index}`}>Item name</FieldLabel>
                          <FieldContent>
                            <Input
                              id={`item-name-${index}`}
                              onChange={(event) => updateItem(index, "name", event.target.value)}
                              placeholder="Food or drink name"
                              value={item.name}
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`item-quantity-${index}`}>Quantity</FieldLabel>
                          <FieldContent>
                            <Input
                              id={`item-quantity-${index}`}
                              onChange={(event) =>
                                updateItem(index, "quantityEstimate", event.target.value)
                              }
                              placeholder="1 bowl, 250 ml, 2 slices"
                              value={item.quantityEstimate}
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`item-calories-${index}`}>Final calories</FieldLabel>
                          <FieldContent>
                            <Input
                              id={`item-calories-${index}`}
                              inputMode="numeric"
                              onChange={(event) =>
                                updateItem(index, "finalCalories", event.target.value)
                              }
                              type="number"
                              value={item.finalCalories}
                            />
                          </FieldContent>
                          <FieldDescription>
                            This value rolls up into the final daily total.
                          </FieldDescription>
                        </Field>
                      </FieldGroup>
                    </FieldSet>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {item.aiName || item.aiQuantityEstimate || item.aiCalories != null ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">Original AI estimate</div>
                          <div className="mt-2">Item: {item.aiName ?? "Not saved"}</div>
                          <div>
                            Quantity: {item.aiQuantityEstimate ?? "Not saved"}
                          </div>
                          <div>Calories: {formatCalories(item.aiCalories)}</div>
                          {item.confidence != null ? (
                            <div>Confidence: {formatConfidence(item.confidence)}</div>
                          ) : null}
                          {item.reasoning ? <div>Reasoning: {item.reasoning}</div> : null}
                        </div>
                      ) : null}

                      {item.id && (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">Saved user values</div>
                          <div className="mt-2">
                            Item: {entry.items.find((entryItem) => entryItem.id === item.id)?.userName ?? "No name edit saved"}
                          </div>
                          <div>
                            Quantity: {entry.items.find((entryItem) => entryItem.id === item.id)?.userQuantityEstimate ?? "No quantity edit saved"}
                          </div>
                          <div>
                            Calories: {entry.items.find((entryItem) => entryItem.id === item.id)?.userCalories != null
                              ? formatCalories(entry.items.find((entryItem) => entryItem.id === item.id)?.userCalories ?? null)
                              : "No calorie edit saved"}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Empty className="border border-dashed border-border/70 bg-background/60">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircleIcon />
                  </EmptyMedia>
                  <EmptyTitle>No items yet</EmptyTitle>
                  <EmptyDescription>
                    Add the foods or drinks in this meal so the final total can be saved.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  You can build the meal manually if the AI missed it.
                </EmptyContent>
              </Empty>
            )}

            <Button onClick={addItem} size="lg" type="button" variant="outline">
              <PlusIcon data-icon="inline-start" />
              Add missing item
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="min-h-12 w-full"
              disabled={pending}
              onClick={() => submitVerification(false)}
              size="lg"
              type="button"
              variant="outline"
            >
              <SaveIcon data-icon="inline-start" />
              {pending ? "Saving..." : "Save changes"}
            </Button>
            <Button
              className="min-h-12 w-full"
              disabled={pending}
              onClick={() => submitVerification(true)}
              size="lg"
              type="button"
            >
              <CheckCircle2Icon data-icon="inline-start" />
              {pending ? "Saving..." : "Confirm entry"}
            </Button>
          </CardFooter>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="glass-card border border-white/50 shadow-lg">
            <CardHeader>
              <CardTitle>Ask for a correction</CardTitle>
              <CardDescription>
                Add context like hidden ingredients, swaps, or sauces to get a revised estimate.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${entry.id}-correction`}>
                    Correction for this meal
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      id={`${entry.id}-correction`}
                      onChange={(event) => setCorrectionMessage(event.target.value)}
                      placeholder="There was chicken hidden under the egg."
                      rows={4}
                      value={correctionMessage}
                    />
                  </FieldContent>
                  <FieldDescription>
                    KnowYourCalories sends the photo, original AI result, current item breakdown, and your note to Gemini for a proposed revision.
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <Button
                className="min-h-12"
                disabled={pending || correctionMessage.trim().length < 2}
                onClick={submitCorrection}
                size="lg"
                type="button"
              >
                <PlusIcon data-icon="inline-start" />
                {pending ? "Working..." : "Get revised estimate"}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/50 shadow-lg">
            <CardHeader>
              <CardTitle>Follow-up correction history</CardTitle>
              <CardDescription>
                Review each correction and its revised estimate before it changes your saved meal.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {entry.followUps.length ? (
                [...entry.followUps].reverse().map((followUp) => (
                  <Card className="border border-border/70 bg-background/70" key={followUp.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <CardTitle className="text-base">{followUp.userPrompt}</CardTitle>
                          <CardDescription>
                            {format(followUp.createdAt, "EEE, h:mm a")}
                          </CardDescription>
                        </div>
                        <Badge variant={getFollowUpBadgeVariant(followUp.status)}>
                          {followUp.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                          <div className="text-sm text-muted-foreground">Previous total</div>
                          <div className="text-xl font-semibold">
                            {formatCalories(followUp.previousTotalKcal)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                          <div className="text-sm text-muted-foreground">Revised total</div>
                          <div className="text-xl font-semibold">
                            {formatCalories(followUp.revisedTotalKcal)}
                          </div>
                        </div>
                      </div>

                      {followUp.failureReason ? (
                        <Alert>
                          <AlertCircleIcon />
                          <AlertTitle>Revision failed</AlertTitle>
                          <AlertDescription>{followUp.failureReason}</AlertDescription>
                        </Alert>
                      ) : null}

                      {followUp.result ? (
                        <div className="flex flex-col gap-4">
                          <div className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                            {followUp.result.mealTitle ? (
                              <div>Revised AI title: {followUp.result.mealTitle}</div>
                            ) : null}
                            <div>
                              Revised confidence:{" "}
                              {formatFollowUpConfidence(followUp.result.confidence)}
                            </div>
                            {followUp.model ? <div>Model: {followUp.model}</div> : null}
                            {followUp.promptVersion ? (
                              <div>Prompt version: {followUp.promptVersion}</div>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-3">
                            {followUp.result.items.map((item, index) => (
                              <div
                                className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm"
                                key={`${followUp.id}-${index}-${item.name}`}
                              >
                                <div className="font-medium">{item.name}</div>
                                <div className="text-muted-foreground">
                                  {item.quantityEstimate} | {formatCalories(item.kcal)}
                                </div>
                                <div className="mt-1 text-muted-foreground">{item.reasoning}</div>
                              </div>
                            ))}
                          </div>

                          {followUp.result.assumptions.length ? (
                            <div className="flex flex-col gap-2">
                              {followUp.result.assumptions.map((assumption) => (
                                <div
                                  className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground"
                                  key={assumption}
                                >
                                  {assumption}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {followUp.result.questionsForUser.length ? (
                            <div className="flex flex-col gap-2">
                              {followUp.result.questionsForUser.map((question) => (
                                <div
                                  className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground"
                                  key={question}
                                >
                                  {question}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {followUp.result.warning ? (
                            <Alert>
                              <AlertCircleIcon />
                              <AlertTitle>Revision warning</AlertTitle>
                              <AlertDescription>{followUp.result.warning}</AlertDescription>
                            </Alert>
                          ) : null}

                          {followUp.status === "proposed" ? (
                            <div className="flex flex-col gap-3">
                              <Button
                                className="min-h-12 w-full"
                                disabled={pending}
                                onClick={() => acceptFollowUp(followUp.id)}
                                size="lg"
                                type="button"
                              >
                                <CheckCircle2Icon data-icon="inline-start" />
                                {pending ? "Working..." : "Accept revised result"}
                              </Button>
                              <Button
                                className="min-h-12 w-full"
                                disabled={pending}
                                onClick={() => loadFollowUpIntoEditor(followUp)}
                                size="lg"
                                type="button"
                                variant="outline"
                              >
                                <SaveIcon data-icon="inline-start" />
                                Load into editor
                              </Button>
                              <Button
                                className="min-h-12 w-full"
                                disabled={pending}
                                onClick={() => rejectFollowUp(followUp.id)}
                                size="lg"
                                type="button"
                                variant="outline"
                              >
                                <Trash2Icon data-icon="inline-start" />
                                Reject revised result
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Empty className="border border-dashed border-border/70 bg-background/60 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle>No follow-up revisions yet</EmptyTitle>
                    <EmptyDescription>
                      Submit a correction if the photo estimate missed a hidden ingredient or got the portion wrong.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/50 shadow-lg">
            <CardHeader>
              <CardTitle>AI assumptions</CardTitle>
              <CardDescription>
                These are the assumptions behind the estimate.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {entry.assumptions.length ? (
                entry.assumptions.map((assumption) => (
                  <div
                    className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground"
                    key={assumption}
                  >
                    {assumption}
                  </div>
                ))
              ) : (
                <Empty className="border border-dashed border-border/70 bg-background/60 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle>No extra assumptions saved</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/50 shadow-lg">
            <CardHeader>
              <CardTitle>AI questions for you</CardTitle>
              <CardDescription>
                If these matter, answer them through your edits before confirming.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {entry.questionsForUser.length ? (
                entry.questionsForUser.map((question) => (
                  <div
                    className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground"
                    key={question}
                  >
                    {question}
                  </div>
                ))
              ) : (
                <Empty className="border border-dashed border-border/70 bg-background/60 p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle>No follow-up questions</EmptyTitle>
                    <EmptyDescription>
                      The AI did not ask for any extra clarification on this meal.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/50 shadow-lg">
            <CardHeader>
              <CardTitle>How totals work</CardTitle>
              <CardDescription>
                KnowYourCalories always counts the final saved meal total in your daily summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div>Original AI estimate: {formatCalories(entry.aiTotalKcal)}</div>
              <Separator />
              <div>
                Saved user-edited total:{" "}
                {entry.userTotalKcal != null
                  ? formatCalories(entry.userTotalKcal)
                  : "No saved user total yet"}
              </div>
              <Separator />
              <div>Saved final total: {formatCalories(entry.finalTotalKcal)}</div>
              <Separator />
              <div>Current editor total: {formatCalories(totalCalories)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
