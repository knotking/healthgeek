
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import HowItWorks from '@/components/landing/how-it-works';
import Footer from '@/components/landing/footer';
import AuthRedirect from '@/components/landing/auth-redirect';

export default function Home() {
  return (
    <>
      <AuthRedirect />
      <div className="flex min-h-dvh flex-col bg-background">
        <Header />
        <main className="flex-1">
          <Hero />
          <HowItWorks />
        </main>
        <Footer />
      </div>
    </>
  );
}
