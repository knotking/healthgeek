import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import FeatureSummary from '@/components/landing/feature-summary';
import FaqGenerator from '@/components/landing/faq-generator';
import ConversionOptimizer from '@/components/landing/conversion-optimizer';
import InteractiveDemo from '@/components/landing/interactive-demo';
import ContactForm from '@/components/landing/contact-form';
import Footer from '@/components/landing/footer';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeatureSummary />
        <FaqGenerator />
        <ConversionOptimizer />
        <InteractiveDemo />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
