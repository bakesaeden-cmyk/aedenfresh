"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  FastForward,
  Loader2,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Subscription {
  id: string;
  frequency: string;
  custom_days: string[] | null;
  status: "active" | "paused" | "cancelled";
  next_delivery_date: string | null;
  paused_until: string | null;
  saved_combos: { name: string | null; portion_size: string | null } | null;
  stores: { name: string } | null;
  delivery_slots: { start_time: string; end_time: string } | null;
}

const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  alternate_days: "Alternate days",
  custom: "Custom days",
};

export function SubscriptionList({ initial }: { initial: Subscription[] }) {
  const [subs, setSubs] = useState<Subscription[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(
    id: string,
    action: "skip" | "pause" | "resume" | "cancel",
  ) {
    if (action === "cancel" && !window.confirm("Cancel this subscription for good?")) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "pause" ? { action, pause_days: 7 } : { action },
        ),
      });
      const data = (await res.json()) as {
        subscription?: Partial<Subscription>;
        error?: string;
      };
      if (!res.ok || !data.subscription) {
        setError("That didn't work — please try again.");
        return;
      }
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data.subscription } : s)),
      );
    } catch {
      setError("That didn't work — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (subs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <CalendarClock className="text-muted-foreground" size={28} />
          <p className="text-muted-foreground">
            No subscriptions yet — build a bowl and choose
            <strong className="text-foreground"> Subscribe & Save</strong>.
          </p>
          <Button asChild>
            <Link href="/build">Build Your Salad</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {subs.map((sub) => {
        const busy = busyId === sub.id;
        return (
          <Card key={sub.id} className={sub.status === "cancelled" ? "opacity-55" : ""}>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {sub.saved_combos?.name ?? "My combo"}
                    {sub.saved_combos?.portion_size && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {sub.saved_combos.portion_size}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {FREQ_LABEL[sub.frequency] ?? sub.frequency}
                    {sub.frequency === "custom" &&
                      sub.custom_days &&
                      ` (${sub.custom_days.join(", ")})`}
                    {sub.stores?.name && <> · from {sub.stores.name}</>}
                    {sub.delivery_slots &&
                      ` · ${sub.delivery_slots.start_time.slice(0, 5)}–${sub.delivery_slots.end_time.slice(0, 5)}`}
                  </p>
                </div>
                <Badge
                  variant={
                    sub.status === "active"
                      ? "accent"
                      : sub.status === "paused"
                        ? "gold"
                        : "muted"
                  }
                >
                  {sub.status}
                </Badge>
              </div>

              {sub.status !== "cancelled" && (
                <p className="text-sm">
                  {sub.status === "paused" ? (
                    <>
                      Paused until{" "}
                      <strong>{sub.paused_until ?? "further notice"}</strong>
                    </>
                  ) : (
                    <>
                      Next delivery:{" "}
                      <strong>{sub.next_delivery_date ?? "—"}</strong>
                    </>
                  )}
                </p>
              )}

              {sub.status !== "cancelled" && (
                <div className="flex flex-wrap gap-2">
                  {sub.status === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => act(sub.id, "skip")}
                      >
                        {busy ? <Loader2 className="animate-spin" /> : <FastForward />}
                        Skip next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => act(sub.id, "pause")}
                      >
                        <PauseCircle /> Pause 1 week
                      </Button>
                    </>
                  )}
                  {sub.status === "paused" && (
                    <Button
                      variant="accent"
                      size="sm"
                      disabled={busy}
                      onClick={() => act(sub.id, "resume")}
                    >
                      <PlayCircle /> Resume now
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => act(sub.id, "cancel")}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle /> Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
