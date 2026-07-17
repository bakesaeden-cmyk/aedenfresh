"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "af_intro_seen";
const MAX_MS = 4200; // hard cap — never hold the store hostage

/**
 * One-time animated logo reveal shown when the store first opens
 * (per browser session). Skipped for reduced-motion users and on
 * any playback problem.
 */
export function LogoSplash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sessionStorage.setItem(SEEN_KEY, "1");
        return;
      }
      sessionStorage.setItem(SEEN_KEY, "1");
      queueMicrotask(() => setShow(true));
    } catch {
      /* storage unavailable — skip the splash */
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const done = () => setLeaving(true);
    const cap = setTimeout(done, MAX_MS);
    const video = videoRef.current;
    video?.addEventListener("ended", done);
    video?.addEventListener("error", done);
    // If autoplay is blocked, don't sit on a frozen frame
    void video?.play().catch(done);
    return () => {
      clearTimeout(cap);
      video?.removeEventListener("ended", done);
      video?.removeEventListener("error", done);
    };
  }, [show]);

  // Unmount after the fade-out transition
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setShow(false), 650);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-white transition-opacity duration-600 ease-out ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        src="/logo-reveal.mp4"
        muted
        playsInline
        preload="auto"
        className="w-full max-w-xl"
      />
    </div>
  );
}
