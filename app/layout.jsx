import './globals.css';

export const metadata = {
  title: 'VaaniRAG — Sub-200ms Voice-First RAG for Indian Languages',
  description: 'Speak a question in your voice, get a grounded answer pulled straight from real MS MARCO passages — transcribed, retrieved, and answered in under 200ms end-to-end.',
  keywords: ['RAG', 'Voice AI', 'Sarvam AI', 'MS MARCO', 'Indian Languages', 'pgvector', 'Supabase', 'Low Latency'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-dark text-slate-100 min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
