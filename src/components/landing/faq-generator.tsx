'use client';

import { useState } from 'react';
import { generateFaq, GenerateFaqOutput } from '@/ai/flows/faq-generator';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function FaqGenerator() {
  const [loading, setLoading] = useState(false);
  const [faqResult, setFaqResult] = useState<GenerateFaqOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateFaqs = async () => {
    setLoading(true);
    setError(null);
    setFaqResult(null);
    try {
      const result = await generateFaq({
        userActivity: 'User has been searching for low-impact cardio exercises and healthy snack recipes.',
        userInterests: 'Weight loss, cardiovascular health, meal planning.',
      });
      setFaqResult(result);
    } catch (e) {
      setError('Failed to generate FAQs. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="faq-generator" className="container py-24 sm:py-32">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="text-3xl lg:text-4xl font-bold">
            AI-Powered FAQ Generator
          </h2>
          <p className="text-lg text-muted-foreground">
            Curious what others are asking? Our AI can generate common health questions based on typical user interests. See how HealthGeek provides relevant, instant answers.
          </p>
          <Button onClick={handleGenerateFaqs} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Sample FAQs
          </Button>
        </div>
        <Card className="min-h-[300px] flex items-center justify-center">
          <CardContent className="w-full pt-6">
            {loading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {error && <p className="text-destructive">{error}</p>}
            {faqResult && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Generated Questions</h3>
                <Accordion type="single" collapsible className="w-full">
                  {faqResult.faqs.map((faq, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>{faq}</AccordionTrigger>
                      <AccordionContent>
                        This is a sample answer. In our full platform, AI will provide a detailed and personalized response to this question.
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
            {!loading && !error && !faqResult && (
              <div className="text-center text-muted-foreground">
                <p>Click the button to see the AI in action!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
