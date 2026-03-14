"use client";

import { useState, useCallback } from "react";
import AsciiOverlay from "./components/AsciiOverlay";

const backgroundSrc = "/paul-reiffer.jpg";

export default function HomePage() {
  const [revealed, setRevealed] = useState(false);

  const handleDecodeComplete = useCallback(() => {
    setRevealed(true);
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card" aria-label="VIT landing page">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-vignette" aria-hidden="true" />
        <AsciiOverlay src={backgroundSrc} onDecodeComplete={handleDecodeComplete} />

        <img
          src="/logo.svg"
          alt="vit"
          className={`hero-logo${revealed ? " revealed" : ""}`}
        />

        <section className={`hero-copy${revealed ? " revealed" : ""}`}>
          <h1 className="hero-subtitle">Git for Video Editing</h1>
          <a className="download-button" href="#">
            <span>Download</span>
          </a>
        </section>
      </section>
    </main>
  );
}
