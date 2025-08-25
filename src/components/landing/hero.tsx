import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-transparent bg-clip-text">
              HealthGeek.ai
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
          <Button className="w-full md:w-1/3">Get Started</Button>
        </div>
      </div>

      <div className="z-10">
        <Image
          src="https://placehold.co/700x500.png"
          width={700}
          height={500}
          alt="A vibrant representation of digital health monitoring on a device"
          className="rounded-lg shadow-2xl"
          data-ai-hint="digital health monitoring"
        />
      </div>

      <div className="shadow"></div>
    </section>
  );
}
