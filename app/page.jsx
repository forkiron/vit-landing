"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AsciiOverlay from "./components/AsciiOverlay";

const backgroundSrc = "/paul-reiffer.jpg";

const COMMANDS = {
  mac: "curl -fsSL https://raw.githubusercontent.com/LucasHJin/vit/main/install.sh | bash",
  windows: "irm https://raw.githubusercontent.com/LucasHJin/vit/main/install.ps1 | iex",
};

export default function HomePage() {
  const [revealed, setRevealed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const wrapperRef = useRef(null);

  const handleDecodeComplete = useCallback(() => {
    setRevealed(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyCommand = useCallback((platform) => {
    navigator.clipboard.writeText(COMMANDS[platform]);
    setCopied(platform);
    setDropdownOpen(false);
    setTimeout(() => setCopied(null), 2000);
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
          <h1 className="hero-subtitle">git for video editing</h1>

          <div className="download-wrapper" ref={wrapperRef}>
            <p className="download-hint">try it in davinci!</p>
            <div className="download-button">
              <button
                className="download-main"
                onClick={() => setDropdownOpen((o) => !o)}
              >
                <span>{copied ? "paste in terminal!" : "install command"}</span>
                <svg className={`download-arrow${dropdownOpen ? " open" : ""}`} width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {dropdownOpen && (
              <div className="download-dropdown">
                <button onClick={() => copyCommand("mac")}>
                  <span className="dropdown-icon">&#63743;</span>
                  macOS / Linux
                </button>
                <button onClick={() => copyCommand("windows")}>
                  <span className="dropdown-icon">⊞</span>
                  Windows
                </button>
              </div>
            )}
          </div>
        </section>

        <div
          className={`github-link${revealed ? " revealed" : ""}`}
          role="group"
          aria-label="Links"
        >
          <a
            href="https://github.com/LucasHJin/vit"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>
          <span aria-hidden="true">|</span>
          <a
            href="https://www.youtube.com/watch?v=phS28hhJSP8"
            target="_blank"
            rel="noopener noreferrer"
          >
            demo vid
          </a>
        </div>
      </section>
    </main>
  );
}
