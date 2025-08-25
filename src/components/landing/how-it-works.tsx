import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserPlus, FileScan, Sparkles, LineChart } from "lucide-react";

const steps = [
  {
    icon: <UserPlus className="w-12 h-12 text-primary" />,
    title: "1. Create Your Profile",
    description: "Sign up and provide your health details, goals, and dietary preferences. This creates a personalized baseline for our AI.",
  },
  {
    icon: <FileScan className="w-12 h-12 text-primary" />,
    title: "2. Analyze & Track",
    description: "Snap a photo of your meal or upload a health report. Our AI instantly analyzes the content and logs your data.",
  },
  {
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    title: "3. Get Recommendations",
    description: "Receive AI-generated meal plans, workout routines, and meditation guides tailored specifically to your health profile.",
  },
  {
    icon: <LineChart className="w-12 h-12 text-primary" />,
    title: "4. Monitor Your Progress",
    description: "Visualize your journey with insightful charts and reports, helping you stay motivated and make informed decisions.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="container text-center py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
      <p className="md:w-3/4 mx-auto mt-4 mb-12 text-xl text-muted-foreground">
        Getting started with HealthGeek is simple. Follow these four easy steps to begin your personalized health journey.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step) => (
          <Card key={step.title} className="bg-muted/50 flex flex-col items-center text-center">
            <CardHeader>
              {step.icon}
              <CardTitle className="mt-4">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{step.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
