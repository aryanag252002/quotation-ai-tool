import type { Metadata } from "next";
import { DataAccessView } from "@/components/deal/views/data-access-view";

export const metadata: Metadata = { title: "Data access" };

export default function DealDataAccessPage() {
  return <DataAccessView />;
}
