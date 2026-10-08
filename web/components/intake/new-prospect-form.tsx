"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SYSTEM_LABEL } from "@/lib/format";
import type { AccessPath, LedgerSystem } from "@/lib/types";

const ACCESS: { id: AccessPath; title: string; body: string }[] = [
  { id: "accountant_user", title: "Accountant invite (recommended)", body: "Prospect invites us as an accountant user; we connect QuoteIQ ourselves. Nothing new for the prospect to approve." },
  { id: "prospect_oauth", title: "Prospect connects via portal", body: "Prospect’s admin clicks “Connect” in the secure portal (read-only use, revoke anytime)." },
  { id: "file_upload", title: "Upload exports", body: "For desktop software or prospects who won’t connect: trial balance, GL, bank statements." },
];

type Field = "company" | "contact" | "email" | "system";

export function NewProspectForm() {
  const [values, setValues] = useState({ company: "", website: "", contact: "", title: "", email: "", system: "" as LedgerSystem | "", notes: "" });
  const [access, setAccess] = useState<AccessPath>("accountant_user");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [created, setCreated] = useState(false);

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
    setErrors(e);
    return Object.keys(e).length === 0;
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
              ? `We emailed ${values.email} instructions to invite Northstar as an accountant user, plus a short questionnaire.`
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
          <Button asChild variant="outline">
            <Link href="/portal/brightside-demo" target="_blank">
              Preview prospect portal <ExternalLink />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/deals">Back to pipeline</Link>
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
        if (validate()) {
          setCreated(true);
          toast.success("Prospect created", { description: "Portal link sent." });
        }
      }}
      className="grid max-w-4xl gap-4 lg:grid-cols-2"
    >
      <Card>
        <CardHeader>
          <CardTitle>Prospect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextField id="company" label="Company name" required value={values.company} error={errors.company} onChange={(v) => setField("company", v)} />
          <TextField id="website" label="Website" value={values.website} placeholder="example.com" onChange={(v) => setField("website", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="contact" label="Contact name" required value={values.contact} error={errors.contact} onChange={(v) => setField("contact", v)} />
            <TextField id="title" label="Title" value={values.title} onChange={(v) => setField("title", v)} />
          </div>
          <TextField id="email" label="Contact email" type="email" required value={values.email} error={errors.email} onChange={(v) => setField("email", v)} />
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
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit">
            <Send /> Create & send portal link
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
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
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
