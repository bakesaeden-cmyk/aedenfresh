"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Leaf, Loader2, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/** Normalise an Indian mobile number to E.164 (+91XXXXXXXXXX). */
function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalised = toE164(phone);
    if (!normalised) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone: normalised });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setE164(normalised);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: "sms",
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="section-container grid min-h-[72vh] items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
      <div className="shadow-luxe-lg relative hidden min-h-[570px] overflow-hidden rounded-[9rem_9rem_2rem_2rem] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=88&auto=format&fit=crop"
          alt="Fresh ingredients prepared for healthy meals"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-secondary/85 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-9 pt-36 text-white">
          <p className="text-primary flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase"><Leaf size={12} /> Your Aeden account</p>
          <p className="mt-3 max-w-md font-serif text-4xl leading-[0.95]">Saved bowls, flexible plans, addresses and order tracking—all in one place.</p>
        </div>
      </div>
      <Card className="mx-auto w-full max-w-md rounded-[1.75rem]">
        <CardHeader className="text-center">
          <p className="eyebrow mx-auto mb-2"><ShieldCheck size={12} /> Password-free access</p>
          <CardTitle className="text-4xl">
            {step === "phone" ? "Sign in" : "Enter the code"}
          </CardTitle>
          <CardDescription>
            {step === "phone"
              ? "We'll send a one-time code to your mobile number."
              : `Sent to ${e164}. It may take a few seconds.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={sendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Mobile number</Label>
                <div className="relative">
                  <Phone
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  maxLength={6}
                  className="text-center text-lg tracking-[0.5em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" disabled={loading || otp.length < 6}>
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Verify & sign in
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
