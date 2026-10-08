"use client";

import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { removeCustomDeal, restartCustomDeal } from "@/lib/state/custom-deals";
import { useDealWorkspace } from "@/lib/state/deal-workspace";

/** Restart or delete a prospect that was added during the demo. */
export function CustomDealActions() {
  const router = useRouter();
  const { deal } = useDealWorkspace();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          restartCustomDeal(deal.id);
          router.push(`/deals/${deal.id}`);
          toast.success("Demo restarted", { description: "Back to waiting for books access." });
        }}
      >
        <RotateCcw /> Restart demo
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`Delete ${deal.prospect.name}`}>
            <Trash2 />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this prospect?</DialogTitle>
            <DialogDescription>
              {deal.prospect.name} and its quote are removed from this browser. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                router.push("/deals");
                removeCustomDeal(deal.id);
                toast.success("Prospect deleted");
              }}
            >
              Delete prospect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
