"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function PwaSplash() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsVisible(false), 700);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      className={`pwa-splash ${isVisible ? "pwa-splash-visible" : ""}`}
      aria-hidden="true"
    >
      <Image
        src="/logo-ttlog.jpg?v=2"
        alt=""
        width={112}
        height={112}
        priority
        className="h-28 w-28 rounded-[28px] object-cover shadow-[0_20px_45px_rgba(9,63,180,0.24)]"
      />
      <span>TTLog</span>
    </div>
  );
}
