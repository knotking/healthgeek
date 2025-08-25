import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, BarChart3, Puzzle, Mail } from "lucide-react";

const features = [
  {
    icon: <Bot className="w-8 h-8 text-accent" />,
    title: "FAQ Generator",
    description:
      "Our AI creates FAQs based on user activity, providing instant, relevant answers to common health questions.",
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-accent" />,
    title: "Conversion Optimizer",
    description:
      "We analyze visitor interactions to suggest data-driven improvements, boosting engagement and conversions.",
  },
  {
    icon: <Puzzle className="w-8 h-8 text-accent" />,
    title: "Interactive Demos",
    description:
      "Engage with our platform's capabilities through hands-on demos that showcase our powerful health tools.",
  },
  {
    icon: <Mail className="w-8 h-8 text-accent" />,
    title: "Lead Capture",
    description:
      "A seamless contact form for inquiries, ensuring you can easily connect with our team for support or partnerships.",
  },
];

export default function FeatureSummary() {
  return (
    <section id="features" className="container py-24 sm:py-32 space-y-8">
      <h2 className="text-3xl lg:text-4xl font-bold md:text-center">
        Features
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(({ icon, title, description }) => (
          <Card key={title} className="bg-card border-2 border-primary/10 hover:border-primary/40 transition-colors duration-300 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                {icon}
              </div>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>{description}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
