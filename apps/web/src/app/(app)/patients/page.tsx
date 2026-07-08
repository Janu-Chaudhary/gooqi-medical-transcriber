"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  ChevronRight,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import type { PatientListItem } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PatientsPage() {
  const { request } = useApi();
  const [patients, setPatients] = useState<PatientListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<{ patients: PatientListItem[] }>(
        "/api/patients",
      );
      setPatients(data.patients ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients.");
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!patients) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q),
    );
  }, [patients, filter]);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in text-foreground">
      {/* Directory Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 sm:pb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-icons bg-primary/15 text-primary border border-primary/25">
            <Users className="size-4 sm:size-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Patients Directory</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage medical records, demographics, and clinical timelines.
            </p>
          </div>
        </div>

        <Button 
          size="lg" 
          onClick={() => setAddOpen(true)}
          className="rounded-buttons bg-primary hover:bg-primary/90 text-primary-foreground border border-border w-full sm:w-auto"
        >
          <UserPlus className="size-4" />
          Add New Patient
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search patient name or phone…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9 bg-card border-border focus:border-primary text-foreground placeholder:text-muted-foreground/60 rounded-inputs"
        />
      </div>

      {error && (
        <div className="rounded-cards border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {patients === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State Illustration */
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center bg-card border border-border rounded-cards backdrop-blur-md">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted border border-border text-primary">
            <Users className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              {patients.length > 0 ? "No matched patients found" : "No patients in directory"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {patients.length > 0
                ? "Try searching for a different patient name or telephone number."
                : "Patients are registered automatically when you record their first ambient scribe session."}
            </p>
          </div>
          {patients.length === 0 && (
            <Button 
              onClick={() => setAddOpen(true)}
              className="rounded-buttons bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="size-4" />
              Add Patient
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden overflow-hidden md:block bg-card border border-border rounded-cards backdrop-blur-md">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Age</th>
                  <th className="px-5 py-4">Visits</th>
                  <th className="px-5 py-4">Last Visit</th>
                  <th className="w-12 px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/patients/${p.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/10">
                          {p.name[0]?.toUpperCase() || "?"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground/60 mt-0.5 font-mono">
                            ID: {p.id.slice(0, 8)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                      {p.phone || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {ageFromDob(p.dob) ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded-tags font-semibold">
                        <ClipboardList className="size-3" />
                        {p.session_count} visit{p.session_count === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-primary" />
                        {formatDate(p.last_visit_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <PatientRowMenu
                        id={p.id}
                        name={p.name}
                        sessionCount={p.session_count}
                        onChanged={load}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="relative">
                <Link href={`/patients/${p.id}`}>
                  <Card className="p-4 pr-12 bg-card border border-border hover:border-border/80 rounded-cards backdrop-blur-md transition-all group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-tags font-semibold">
                        {p.session_count} visits
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                      {p.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3 text-primary" />
                          {p.phone}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3 text-primary" />
                        {formatDate(p.last_visit_at)}
                      </span>
                    </div>
                  </Card>
                </Link>
                <div className="absolute right-2 top-3">
                  <PatientRowMenu
                    id={p.id}
                    name={p.name}
                    sessionCount={p.session_count}
                    onChanged={load}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Patient Modal */}
      <AddPatientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => void load()}
      />
    </div>
  );
}

function PatientRowMenu({
  id,
  name,
  sessionCount,
  onChanged,
}: {
  id: string;
  name: string;
  sessionCount: number;
  onChanged: () => void;
}) {
  const { request } = useApi();
  const confirm = useConfirm();

  async function remove() {
    const ok = await confirm({
      title: "Delete patient file?",
      description:
        sessionCount > 0
          ? `Permanently deletes ${name} and all ${sessionCount} associated session${
              sessionCount === 1 ? "" : "s"
            } (audio logs, transcripts, medical notes). Consent records are kept for legal auditing. This cannot be undone.`
          : `Permanently deletes patient file for ${name}. This cannot be undone.`,
      confirmText: "Delete patient",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await request(`/api/patients/${id}`, { method: "DELETE" });
      toast.success("Patient deleted");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete patient.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-60 group-hover:opacity-100 text-muted-foreground hover:bg-muted"
          aria-label="Patient actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl">
        <DropdownMenuItem asChild className="text-muted-foreground focus:bg-muted text-xs">
          <Link href={`/patients/${id}`} className="flex items-center gap-2">
            <ArrowRight className="size-4" />
            Open 360 profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive focus:bg-muted text-xs"
          onClick={remove}
        >
          <Trash2 className="size-4" />
          Delete patient
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddPatientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { request } = useApi();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length === 0) return;
    setSaving(true);
    try {
      await request("/api/patients", {
        method: "POST",
        body: {
          name: name.trim(),
          phone: phone.trim() || null,
          dob: dob || null,
          gender: gender || null,
        },
      });
      toast.success("Patient added successfully");
      onOpenChange(false);
      setName("");
      setPhone("");
      setDob("");
      setGender("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add patient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md p-6 shadow-2xl rounded-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Register new patient</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Create an offline patient profile. You can also start recording directly and the system registers the patient automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="np-name" className="text-xs text-muted-foreground">Full Patient Name</Label>
            <Input
              id="np-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              className="bg-muted/30 border-border focus:border-primary text-xs h-9 text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="np-phone" className="text-xs text-muted-foreground">Phone Number</Label>
              <Input
                id="np-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="bg-muted/30 border-border focus:border-primary text-xs h-9 text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-dob" className="text-xs text-muted-foreground">Date of Birth</Label>
              <Input
                id="np-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="bg-muted/30 border-border focus:border-primary text-xs h-9 text-foreground"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-gender" className="text-xs text-muted-foreground">Gender</Label>
            <Select
              id="np-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="bg-muted/30 border-border focus:border-primary text-xs h-9 text-foreground"
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border mt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-9 px-4 text-xs rounded border-border hover:bg-muted">
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={saving}
            disabled={name.trim().length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-5 shadow-lg rounded-md"
          >
            Add Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ageFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0 || age > 150) return null;
  return `${age}y`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
