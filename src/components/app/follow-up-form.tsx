"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { addFollowUpAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function FollowUpForm({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          const result = await addFollowUpAction({
            entryId,
            message,
          });

          if (result.ok) {
            toast.success(result.message);
            setMessage("");
            router.refresh();
            return;
          }

          toast.error(result.message);
          router.refresh();
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${entryId}-follow-up`}>
            Follow-up or correction note
          </FieldLabel>
          <FieldContent>
            <Textarea
              id={`${entryId}-follow-up`}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add context like sauces, swaps, or a better estimate."
              rows={3}
              value={message}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? "Saving..." : "Save follow-up"}
      </Button>
    </form>
  );
}
