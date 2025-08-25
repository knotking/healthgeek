'use client';

import { useState } from 'react';
import { conversionOptimizer, ConversionOptimizerOutput } from '@/ai/flows/conversion-optimizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Lightbulb } from 'lucide-react';
import Image from 'next/image';

export default function ConversionOptimizer() {
  const [loading, setLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<ConversionOptimizerOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimization = async () => {
    setLoading(true);
    setError(null);
    setOptimizationResult(null);
    try {
      const result = await conversionOptimizer({
        landingPageData: 'The landing page has a hero section with a "Get Started" button, a features section, and a contact form. The primary call-to-action is signing up for a free trial.',
        visitorInteractionData: 'Heatmap analysis shows users spend time on the features section but have a 40% drop-off rate before the contact form. Only 5% of visitors click "Get Started".',
      });
      setOptimizationResult(result);
    } catch (e) {
      setError('Failed to generate suggestions. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="optimizer" className="bg-muted/50 py-24 sm:py-32">
      <div className="container grid lg:grid-cols-2 gap-8 items-center">
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Conversion Insights</CardTitle>
              <CardDescription>Click below to see how our AI analyzes user behavior to provide actionable suggestions for improving website engagement.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleOptimization} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze and Suggest Improvements
              </Button>
              <div className="mt-4 min-h-[150px] rounded-lg border bg-background p-4 flex items-center justify-center">
                {loading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                {error && <p className="text-destructive">{error}</p>}
                {optimizationResult && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                        <Lightbulb className="h-5 w-5" />
                        <span>Optimization Suggestions</span>
                    </div>
                    <p className="text-muted-foreground">{optimizationResult.suggestions}</p>
                  </div>
                )}
                 {!loading && !error && !optimizationResult && (
                  <div className="text-center text-muted-foreground">
                    <p>Suggestions will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="order-1 lg:order-2 space-y-4 text-center lg:text-left">
          <h2 className="text-3xl lg:text-4xl font-bold">Optimize for Success</h2>
          <p className="text-lg text-muted-foreground">
            HealthGeek goes beyond personal health. Our tools can analyze engagement on health-related platforms to suggest improvements. This demonstrates our deep understanding of user behavior in the health tech space.
          </p>
           <Image
            src="https://placehold.co/600x400.png"
            width={600}
            height={400}
            alt="An abstract chart showing positive growth and analytics"
            className="rounded-lg shadow-lg mx-auto"
            data-ai-hint="data analytics growth"
          />
        </div>
      </div>
    </section>
  );
}
