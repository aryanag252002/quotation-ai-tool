import Link from "next/link";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LimitedDeal() {
  return (
    <Alert>
      <Info aria-hidden />
      <AlertTitle>Workspace data is available for the Brightside demo only</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          The other pipeline entries illustrate quotes at different stages. Open Brightside Coffee Roasters to walk the
          full flow: data access, analysis, brief, consultation, scope, pricing and approval.
        </p>
        <Button asChild size="sm">
          <Link href="/deals/brightside">Open Brightside Coffee Roasters</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
