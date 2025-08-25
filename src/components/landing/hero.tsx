import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="container grid place-items-center py-20 md:py-32 gap-10">
      <div className="text-center space-y-6">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-transparent bg-clip-text">
              HealthGeek
            </span>{" "}
            Your Personal
          </h1>{" "}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-transparent bg-clip-text">
              Health
            </span>{" "}
            Companion
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          Unlock personalized health insights with our AI-powered platform. We analyze your data to provide actionable advice for a healthier lifestyle.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          <Button className="w-full md:w-1/3" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
