"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteFoodEntryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function HistoryEntryDeleteButton({
  entryId,
  entryTitle,
}: {
  entryId: string;
  entryTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="ghost">
        <Trash2Icon data-icon="inline-start" />
        Delete
      </Button>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Delete this entry?</DrawerTitle>
          <DrawerDescription>
            {entryTitle} will be soft deleted so it stops counting toward daily totals.
            This helps protect your saved history if you tapped delete by mistake.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button
            className="min-h-12"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteFoodEntryAction({ entryId });

                if (result.ok) {
                  toast.success(result.message);
                  setOpen(false);
                  router.push("/history");
                  router.refresh();
                  return;
                }

                toast.error(result.message);
              });
            }}
            size="lg"
            type="button"
            variant="destructive"
          >
            <Trash2Icon data-icon="inline-start" />
            {pending ? "Deleting..." : "Delete entry"}
          </Button>
          <Button onClick={() => setOpen(false)} size="lg" type="button" variant="outline">
            Keep entry
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
