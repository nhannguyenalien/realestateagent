"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage, type Language } from "./language-provider";

const skipLabel: Record<Language, string> = { en: "Skip", vi: "Bỏ qua", ja: "スキップ", fr: "Passer", es: "Omitir" };

export function LoadingScreen() {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const safetyTimer = useRef<number | undefined>(undefined);
  const { language } = useLanguage();
  const pathname = usePathname();

  const finish = useCallback(() => {
    window.clearTimeout(safetyTimer.current);
    visibleRef.current = false;
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    window.clearTimeout(safetyTimer.current);
    visibleRef.current = true;
    setVisible(true);
    safetyTimer.current = window.setTimeout(finish, 2000);
  }, [finish]);

  useEffect(() => {
    if (!visibleRef.current) return;
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
    return () => window.cancelAnimationFrame(frame);
  }, [finish, pathname]);

  useEffect(() => {
    function handleLinkClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin || nextUrl.href === currentUrl.href) return;
      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) return;
      start();
    }

    document.addEventListener("click", handleLinkClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("popstate", start);
      window.clearTimeout(safetyTimer.current);
    };
  }, [start]);

  if (!visible) return null;
  return (
    <div className="loadingScreen" role="status" aria-label="Loading Estate Schools AI">
      <div className="loadingStars" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div>
      <div className="loadingBrand" aria-hidden="true">
        <span className="loadingAura" /><span className="loadingOrbit" />
        <img src="/assets/brand/estate-school-logo.png" alt="" />
        <span className="loadingSweep" /><span className="loadingReflection" />
      </div>
      <div className="loadingProgress" aria-hidden="true"><span /></div>
      <button type="button" onClick={finish}>{skipLabel[language]}</button>
    </div>
  );
}
