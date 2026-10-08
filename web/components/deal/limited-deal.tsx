import Link from "next/link";
import { Info, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LimitedDeal() {
  return (
    <Alert>
      <Info aria-hidden />
      <AlertTitle>This pipeline entry is illustrative</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          It shows a quote at a different stage. To walk the full flow (data access, analysis, brief, consultation,
          scope, pricing and approval), open Brightside Coffee Roasters or add your own prospect.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/deals/brightside">Open Brightside Coffee Roasters</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/deals/new">
              <Plus /> New prospect
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
