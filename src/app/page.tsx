'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import ConversionOptimizer from '@/components/landing/conversion-optimizer';
import InteractiveDemo from '@/components/landing/interactive-demo';
import ContactForm from '@/components/landing/contact-form';
import Footer from '@/components/landing/footer';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <ConversionOptimizer />
        <InteractiveDemo />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
