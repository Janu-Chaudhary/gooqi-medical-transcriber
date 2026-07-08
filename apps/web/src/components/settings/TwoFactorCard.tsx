"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

interface Factor {
  id: string;
  friendlyName?: string;
  status: string;
}

/**
 * Two-factor (TOTP) management for the doctor's account. PHI access should be
 * MFA-protected (SPDI Rules / DPDP reasonable safeguards). Enrolling here
 * creates a verified TOTP factor; the login flow then requires a code
 * (AAL2) on every subsequent sign-in.
 */
export function TwoFactorCard() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Enrollment-in-progress state.
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totp = (data?.totp ?? []) as Factor[];
      setFactors(totp);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load 2FA status.");
      setFactors([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startEnroll() {
    setEnrolling(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setPending({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start enrollment.");
    } finally {
      setEnrolling(false);
    }
  }

  async function confirmEnroll() {
    if (!pending || code.trim().length < 6) return;
    setVerifying(true);
    setError(null);
    try {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({
        factorId: pending.factorId,
      });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: pending.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;
      toast.success("Two-factor authentication enabled");
      setPending(null);
      setCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code — try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function cancelEnroll() {
    // Remove the half-finished (unverified) factor so it doesn't linger.
    if (pending) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: pending.factorId }).catch(() => { });
    }
    setPending(null);
    setCode("");
    setError(null);
  }

  async function remove(factorId: string) {
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("Two-factor authentication removed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove factor.");
    }
  }

  const verified = (factors ?? []).filter((f) => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Two-factor authentication
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Protect access to patient records with a time-based code from an
          authenticator app (Google Authenticator, Authy, 1Password).
        </p>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {factors === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : pending ? (
          <div className="space-y-4 rounded-md border border-border p-4">
            <p className="text-sm">
              Scan this QR code with your authenticator app, then enter the
              6-digit code to finish.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div
                className="rounded-md border border-border bg-white p-2 [&_svg]:size-40"
                // Supabase returns the QR as an inline SVG string.
                dangerouslySetInnerHTML={{ __html: pending.qr }}
              />
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Or enter this secret manually:
                </p>
                <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
                  {pending.secret}
                </code>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={cancelEnroll} disabled={verifying}>
                Cancel
              </Button>
              <Button
                onClick={confirmEnroll}
                loading={verifying}
                disabled={verifying || code.trim().length < 6}
              >
                Verify &amp; enable
              </Button>
            </div>
          </div>
        ) : verified.length > 0 ? (
          <div className="space-y-2">
            {verified.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="size-4 text-success" />
                  {f.friendlyName || "Authenticator app"}
                  <span className="rounded bg-success/10 px-1.5 py-0.5 text-xs text-success">
                    Active
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => remove(f.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldOff className="size-4" />
              Not enabled
            </span>
            <Button onClick={startEnroll} loading={enrolling} disabled={enrolling}>
              Enable 2FA
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
