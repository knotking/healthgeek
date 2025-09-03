import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserPlus, FileScan, Sparkles, LineChart } from "lucide-react";

const steps = [
  {
    icon: <UserPlus className="w-12 h-12 text-primary" />,
    title: "1. Set Up Your Profile",
    description: "Provide your health details, goals, and dietary preferences to create a personalized baseline for our AI agents.",
  },
  {
    icon: <FileScan className="w-12 h-12 text-primary" />,
    title: "2. Gain Deep Insights",
    description: "Analyze health reports, snap photos of your meals for nutritional info, or record a video to get expert posture feedback.",
  },
  {
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    title: "3. Get AI-Powered Guidance",
    description: "Receive tailored workout plans, recipes, meditation scripts, and actionable habit recommendations from our specialized AI agents.",
  },
  {
    icon: <LineChart className="w-12 h-12 text-primary" />,
    title: "4. Track & Progress",
    description: "Visualize your journey with insightful charts, generate detailed reports, and test your knowledge with health quizzes to stay motivated.",
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
