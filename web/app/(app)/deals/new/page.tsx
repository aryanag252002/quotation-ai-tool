import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { NewProspectForm } from "@/components/intake/new-prospect-form";

export const metadata: Metadata = { title: "New prospect" };

export default function NewProspectPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New prospect" description="About 2 minutes. Everything after this runs automatically until the brief is ready." />
      <NewProspectForm />
    </div>
  );
}
