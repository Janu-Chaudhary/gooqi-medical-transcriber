"use client";

import { useEffect, useState } from "react";
import { AlertCircle, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import type { SignoffMethod } from "@gooqi/shared";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ReauthProof {
  token: string;
  method: SignoffMethod;
}

/**
 * Step-up re-authentication before a doctor finalises a note. The doctor
 * re-enters their password (or an emailed code) which mints a *fresh* Supabase
 * access token; we hand that token to the sign-off API as proof the signature
 * is theirs and was made just now (IT Act 2000 §5). Password re-entry is the
 * primary path; the emailed-code fallback covers OAuth/OTP-only accounts.
 */
export function SignoffDialog({
  open,
  onOpenChange,
  doctorName,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorName: string;
  onConfirmed: (proof: ReauthProof) => Promise<void>;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset transient state each time the dialog opens.
    setPassword("");
    setCode("");
    setOtpSent(false);
    setError(null);
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, [open]);

  async function finish(proof: ReauthProof) {
    setBusy(true);
    try {
      await onConfirmed(proof);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-off failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmWithPassword() {
    if (!email || password.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error("Could not obtain a re-authentication token.");
      await finish({ token, method: "password" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Password re-authentication failed.",
      );
      setBusy(false);
    }
  }

  async function sendCode() {
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmWithOtp() {
    if (!email || code.trim().length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error("Could not obtain a re-authentication token.");
      await finish({ token, method: "otp" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Confirm your identity to sign
          </DialogTitle>
          <DialogDescription>
            Finalising this note applies your electronic signature as Dr.{" "}
            {doctorName}. Re-authenticate to confirm it&apos;s you. Finalised
            notes are locked from further editing.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </p>
        )}

        {mode === "password" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signoff-pw">Password</Label>
              <Input
                id="signoff-pw"
                type="password"
                autoFocus
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmWithPassword();
                }}
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode("otp");
                setError(null);
              }}
            >
              <MailCheck className="size-3.5" />
              No password? Email me a code instead
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!otpSent ? (
              <p className="text-sm text-muted-foreground">
                We&apos;ll email a 6-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="signoff-code">6-digit code</Label>
                <Input
                  id="signoff-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void confirmWithOtp();
                  }}
                />
              </div>
            )}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode("password");
                setError(null);
              }}
            >
              <KeyRound className="size-3.5" />
              Use my password instead
            </button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          {mode === "password" ? (
            <Button
              onClick={confirmWithPassword}
              loading={busy}
              disabled={busy || password.length === 0}
            >
              Sign &amp; Finalise
            </Button>
          ) : !otpSent ? (
            <Button onClick={sendCode} loading={busy} disabled={busy || !email}>
              Send code
            </Button>
          ) : (
            <Button
              onClick={confirmWithOtp}
              loading={busy}
              disabled={busy || code.trim().length < 6}
            >
              Sign &amp; Finalise
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
