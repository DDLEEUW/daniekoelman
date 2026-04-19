import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import type { Stats } from "../lib/api";
import { ShareCard } from "./ShareCard";

const CARD_SIZE = 1080;

export function ShareButton({ stats, toast }: { stats: Stats; toast: (m: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.5);

  // Fit the 1080x1080 card into the preview container's width (keeping it square).
  useLayoutEffect(() => {
    if (!open) return;
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / CARD_SIZE);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Lock body scroll while the modal is open so mobile users can reach the buttons.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function toDataUrl(): Promise<string | null> {
    if (!cardRef.current) return null;
    setBusy(true);
    try {
      const url = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0E0B1F",
      });
      return url;
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    const url = await toDataUrl();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `music-buddies-${stats.profile.id}.png`;
    a.click();
    toast("Image downloaded");
  }

  async function copy() {
    try {
      const url = await toDataUrl();
      if (!url) return;
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Copied to clipboard");
    } catch {
      toast("Copy not supported — downloading instead");
      await download();
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        Share as image
      </button>

      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-4 flex items-start sm:items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass p-4 max-w-xl w-full my-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">Share your stats</h3>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-white">✕</button>
              </div>
              {/* Responsive preview: inner div is scaled to match container width so the full card is always visible. */}
              <div
                ref={previewRef}
                className="rounded-xl overflow-hidden bg-black/40"
                style={{ width: "100%", height: `${CARD_SIZE * scale}px` }}
              >
                <div
                  style={{
                    width: CARD_SIZE,
                    height: CARD_SIZE,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <ShareCard ref={cardRef} stats={stats} />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={copy} disabled={busy} className="btn-ghost disabled:opacity-50">
                  {busy ? "Rendering…" : "Copy"}
                </button>
                <button onClick={download} disabled={busy} className="btn-primary disabled:opacity-50">
                  {busy ? "Rendering…" : "Download PNG"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}
