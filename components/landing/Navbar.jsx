'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Github, ArrowRight } from 'lucide-react';

const navLinks = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#guardrails', label: 'Guardrails' },
  { href: '#latency', label: 'Latency' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 border-b border-[#222]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0 group">
          <img
            src="/vaani-logo.png"
            alt="VaaniRAG"
            className="h-[1.75rem] w-auto object-contain opacity-95 group-hover:opacity-100 transition-opacity"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-[#a1a1a1] hover:text-white transition-colors duration-150"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/YASAR300/VaaniRAG"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium text-[#a1a1a1] hover:text-white transition-colors duration-150 flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0a0a0a] bg-white hover:bg-[#e5e5e5] transition-colors px-3.5 py-1.5 rounded-md"
          >
            Launch app
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden text-[#878787] hover:text-white p-1.5"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-[#222] px-6 py-4 space-y-3">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-[#878787] hover:text-white py-1"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2">
            <Link
              href="/app"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a] bg-white px-4 py-2 rounded-md"
            >
              Launch app <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
