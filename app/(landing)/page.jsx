import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ArchitectureShowcase } from '@/components/landing/ArchitectureShowcase';
import { GuardrailsHighlight } from '@/components/landing/GuardrailsHighlight';
import { LatencyTeaser } from '@/components/landing/LatencyTeaser';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';

export const metadata = {
  title: 'VaaniRAG — Sub-200ms Voice-Enabled RAG Pipeline',
  description:
    'Speak a question and get a grounded answer retrieved straight from MS MARCO-XI passages — transcribed via Sarvam AI, retrieved with hybrid pgvector + BM25, and answered in under 200ms end-to-end.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ArchitectureShowcase />
        <GuardrailsHighlight />
        <LatencyTeaser />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
