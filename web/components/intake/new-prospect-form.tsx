"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, FlaskConical, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { tenant } from "@/lib/data/mock/pipeline";
import { INDUSTRY_LABEL, SYSTEM_LABEL } from "@/lib/format";
import { addCustomDeal } from "@/lib/state/custom-deals";
import type { AccessPath, CustomDeal, DemoCondition, DemoSize, Industry, LedgerSystem } from "@/lib/types";

const ACCESS: { id: AccessPath; title: string; body: string }[] = [
  { id: "accountant_user", title: "Accountant invite (recommended)", body: "Prospect invites us as an accountant user; we connect QuoteIQ ourselves. Nothing new for the prospect to approve." },
  { id: "prospect_oauth", title: "Prospect connects via portal", body: "Prospect’s admin clicks “Connect” in the secure portal (read-only use, revoke anytime)." },
  { id: "file_upload", title: "Upload exports", body: "For desktop software or prospects who won’t connect: trial balance, GL, bank statements." },
];

const SIZES: { id: DemoSize; title: string; body: string }[] = [
  { id: "small", title: "Small", body: "~200 txns / mo, 2 accounts" },
  { id: "medium", title: "Growing", body: "~600 txns / mo, 5 accounts" },
  { id: "large", title: "Complex", body: "~1,500 txns / mo, 2 entities" },
];

const CONDITIONS: { id: DemoCondition; title: string; body: string }[] = [
  { id: "clean", title: "Clean", body: "Reconciled and current" },
  { id: "behind", title: "Behind", body: "4 months unreconciled" },
  { id: "messy", title: "Messy", body: "9 months behind, suspense" },
];

type Field = "company" | "contact" | "email" | "system" | "industry" | "estimate";

function newId(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "prospect";
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`;
}

export function NewProspectForm() {
  const [values, setValues] = useState({
    company: "",
    website: "",
    contact: "",
    title: "",
    email: "",
    location: "",
    system: "" as LedgerSystem | "",
    industry: "" as Industry | "",
    estimate: "",
    notes: "",
  });
  const [access, setAccess] = useState<AccessPath>("accountant_user");
  const [size, setSize] = useState<DemoSize>("medium");
  const [condition, setCondition] = useState<DemoCondition>("behind");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [created, setCreated] = useState<string | null>(null);

  const setField = (k: keyof typeof values, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!values.company.trim()) e.company = "Enter the company name.";
    if (!values.contact.trim()) e.contact = "Enter the contact’s name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) e.email = "Enter a valid email address.";
    if (!values.system) e.system = "Choose the accounting system.";
    if (!values.industry) e.industry = "Choose the industry.";
    if (values.estimate && !(Number(values.estimate.replace(/,/g, "")) > 0)) e.estimate = "Enter a number, e.g. 400.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = () => {
    const system = values.system as LedgerSystem;
    const industry = values.industry as Industry;
    const deal: CustomDeal = {
      id: newId(values.company),
      createdAt: new Date().toISOString(),
      ownerId: "u1",
      prospect: {
        name: values.company.trim(),
        industry,
        industryLabel: INDUSTRY_LABEL[industry],
        location: values.location.trim(),
        website: values.website.trim(),
        contactName: values.contact.trim(),
        contactTitle: values.title.trim() || "Owner",
        contactEmail: values.email.trim(),
      },
      system: access === "file_upload" ? "upload" : system,
      accessPath: access,
      notes: values.notes.trim(),
      profile: { size, condition, clientEstimate: values.estimate ? Number(values.estimate.replace(/,/g, "")) : null },
      progress: {},
    };
    addCustomDeal(deal);
    setCreated(deal.id);
    toast.success("Prospect created", { description: access === "accountant_user" ? "Invite instructions sent." : "Portal link sent." });
  };

  if (created) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" aria-hidden /> Prospect created
          </CardTitle>
          <CardDescription>
            {access === "accountant_user"
              ? `We emailed ${values.email} instructions to invite ${tenant.shortName} as an accountant user, plus a short questionnaire.`
              : `We emailed ${values.email} a secure portal link to connect ${values.system ? SYSTEM_LABEL[values.system] : "their books"} and answer a short questionnaire.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">What happens next</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>The prospect connects their books (we nudge automatically after 24 h).</li>
            <li>QuoteIQ pulls 24 months, ties out the trial balance and drafts the pre-call brief.</li>
            <li>You review the brief (~10 min) and schedule the consultation.</li>
          </ol>
        </CardContent>
        <CardFooter className="gap-2 border-t pt-4">
          <Button asChild>
            <Link href={`/deals/${created}`}>
              Open quote workspace <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/portal/${created}`} target="_blank">
              Open prospect portal <ExternalLink />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) create();
      }}
      className="grid max-w-5xl items-start gap-4 lg:grid-cols-2"
    >
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle>Prospect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextField id="company" label="Company name" required value={values.company} error={errors.company} onChange={(v) => setField("company", v)} />
          <div className="space-y-1.5">
            <Label htmlFor="industry">
              Industry <span className="text-destructive">*</span>
            </Label>
            <Select value={values.industry || undefined} onValueChange={(v) => setField("industry", v)}>
              <SelectTrigger id="industry" className="w-full" aria-invalid={!!errors.industry} aria-describedby={errors.industry ? "industry-error" : undefined}>
                <SelectValue placeholder="Select an industry" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(INDUSTRY_LABEL) as Industry[]).map((i) => (
                  <SelectItem key={i} value={i}>
                    {INDUSTRY_LABEL[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.industry ? <p id="industry-error" className="text-xs text-destructive">{errors.industry}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="website" label="Website" value={values.website} placeholder="example.com" onChange={(v) => setField("website", v)} />
            <TextField id="location" label="Location" value={values.location} placeholder="City, State" onChange={(v) => setField("location", v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="contact" label="Contact name" required value={values.contact} error={errors.contact} onChange={(v) => setField("contact", v)} />
            <TextField id="title" label="Title" value={values.title} onChange={(v) => setField("title", v)} />
          </div>
          <TextField id="email" label="Contact email" type="email" required value={values.email} error={errors.email} onChange={(v) => setField("email", v)} />
          <TextField
            id="estimate"
            label="Client’s estimate of monthly transactions"
            value={values.estimate}
            placeholder="e.g. 400"
            hint="Optional. QuoteIQ checks it against the ledger and flags a big gap."
            error={errors.estimate}
            inputMode="numeric"
            onChange={(v) => setField("estimate", v)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={values.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Where did the lead come from? Anything we already know?" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Books access</CardTitle>
          <CardDescription>QuoteIQ works with any accounting system through one connector layer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="system">
              Accounting system <span className="text-destructive">*</span>
            </Label>
            <Select value={values.system || undefined} onValueChange={(v) => setField("system", v)}>
              <SelectTrigger id="system" className="w-full" aria-invalid={!!errors.system} aria-describedby={errors.system ? "system-error" : undefined}>
                <SelectValue placeholder="Select a system" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SYSTEM_LABEL) as LedgerSystem[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SYSTEM_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.system ? <p id="system-error" className="text-xs text-destructive">{errors.system}</p> : null}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How will we access the books?</legend>
            <RadioGroup value={access} onValueChange={(v) => setAccess(v as AccessPath)} className="space-y-2">
              {ACCESS.map((a) => (
                <Label key={a.id} htmlFor={`acc-${a.id}`} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent">
                  <RadioGroupItem id={`acc-${a.id}`} value={a.id} className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">{a.body}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
        </CardContent>
      </Card>

      <Card className="lg:col-start-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-ai" aria-hidden /> Simulated books
          </CardTitle>
          <CardDescription>
            Demo only. There is no live connection yet, so QuoteIQ generates a realistic ledger for this prospect.
            Choose its shape to show different outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChoiceGroup legend="Business size" name="size" value={size} options={SIZES} onChange={setSize} />
          <ChoiceGroup legend="Books condition" name="condition" value={condition} options={CONDITIONS} onChange={setCondition} />
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit">
            <Send /> {access === "accountant_user" ? "Create & send invite instructions" : "Create & send portal link"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  hint,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={!!error}
        inputMode={inputMode}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { id: T; title: string; body: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <Label
            key={o.id}
            htmlFor={`${name}-${o.id}`}
            className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
          >
            <RadioGroupItem id={`${name}-${o.id}`} value={o.id} className="mt-0.5" />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="block text-xs text-muted-foreground">{o.body}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
