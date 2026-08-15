import React from 'react';
import Link from 'next/link';
import { ExternalLink, Github } from 'lucide-react';

const footerLinks = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works',  href: '#how-it-works' },
      { label: 'Architecture',  href: '#architecture' },
      { label: 'Guardrails',    href: '#guardrails'   },
      { label: 'Latency',       href: '#latency'      },
    ],
  },
  {
    heading: 'Open Source',
    links: [
      { label: 'GitHub',        href: 'https://github.com/YASAR300/VaaniRAG', external: true },
      // TODO: update with real Vercel deployment URL before submission (Phase 16)
      { label: 'Live Demo',     href: 'https://vaaniraag.vercel.app', external: true },
      { label: 'MSMARCO-XI',   href: 'https://huggingface.co/datasets/ai4bharat/MSMARCO-XI', external: true },
      { label: 'Sarvam AI',    href: 'https://sarvam.ai', external: true },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Changelog',     href: '#changelog'    },
      { label: 'Analytics',     href: '/app'          },
      { label: 'Docs',          href: '/docs'         },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[#1f1f1f] bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top: logo + link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-block mb-4 group">
              <img
                src="/vaani-logo.png"
                alt="VaaniRAG"
                className="h-[1.75rem] w-auto object-contain opacity-85 group-hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-[13px] text-[#777] leading-relaxed max-w-[200px]">
              Sub-200ms voice RAG pipeline. Built for Hacker House Goa 2026.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-medium tracking-widest uppercase text-[#444] mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] text-[#878787] hover:text-white transition-colors"
                      >
                        {l.label}
                        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[13px] text-[#878787] hover:text-white transition-colors"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom: copyright + badge */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#1a1a1a] pt-8">
          <span className="text-[12px] text-[#444]">
            © 2026 VaaniRAG · Task 2 · Hacker House Goa
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/YASAR300/VaaniRAG"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#444] hover:text-[#878787] transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <span className="text-[11px] font-mono text-[#555] border border-[#1f1f1f] px-2 py-0.5 rounded">
              #RAGInGoa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
