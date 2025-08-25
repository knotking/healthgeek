
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BrainCircuit, FileDown, MoveRight, MoveLeft, Sparkles, Timer, CheckCircle } from 'lucide-react';
import { generateMeditationPractice, type MeditationPracticeOutput } from '@/ai/flows/meditation-recommender';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const meditationGoals = [
  { id: 'stress', label: 'Reduce Stress & Anxiety' },
  { id: 'focus', label: 'Improve Focus' },
  { id: 'sleep', label: 'Promote Better Sleep' },
  { id: 'self-awareness', label: 'Increase Self-Awareness' },
  { id: 'gratitude', label: 'Cultivate Gratitude' },
] as const;

const meditationSchema = z.object({
  duration: z.number().min(5, "Duration must be at least 5 minutes.").max(60, "Duration must be less than 60 minutes."),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening'], { required_error: 'Please select a time of day.' }),
  goals: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one goal.',
  }),
});

type MeditationFormData = z.infer<typeof meditationSchema>;

const Steps = {
  PREFERENCES: 1,
  GENERATING: 2,
  RESULT: 3,
};

export default function MeditationPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [meditationResult, setMeditationResult] = useState<MeditationPracticeOutput | null>(null);
  const [currentStep, setCurrentStep] = useState(Steps.PREFERENCES);

  const form = useForm<MeditationFormData>({
    resolver: zodResolver(meditationSchema),
    defaultValues: {
      duration: 10,
      timeOfDay: 'morning',
      goals: [],
    },
  });

  const fetchUserData = useCallback(async () => {
    if (user) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        } else {
          toast({ variant: 'destructive', title: 'Profile Required', description: 'Please complete your user profile first.' });
        }
      } catch (e: any) {
        toast({ title: "Data Fetch Failed", description: "Could not load your user data.", variant: "destructive" });
      } finally {
        setInitialLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    } else if (!authLoading && !user) {
      setInitialLoading(false);
    }
  }, [user, authLoading, fetchUserData]);
  
  async function onSubmit(values: MeditationFormData) {
    if (!profile || !user) {
      toast({ title: 'Error', description: 'User profile is not loaded.', variant: 'destructive' });
      return;
    }
    setCurrentStep(Steps.GENERATING);
    try {
      const result = await generateMeditationPractice({
        ...values,
        userProfile: JSON.stringify(profile),
      });
      setMeditationResult(result);
      setCurrentStep(Steps.RESULT);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      setCurrentStep(Steps.PREFERENCES);
    }
  }

  function handleDownloadPdf() {
    if (!meditationResult) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text(meditationResult.title, 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(meditationResult.summary, 180);
    doc.text(summaryLines, 105, 30, { align: 'center' });

    (doc as any).autoTable({
      head: [['Benefits']],
      body: [[meditationResult.benefits]],
      startY: 45,
      theme: 'grid'
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    meditationResult.steps.forEach(step => {
      (doc as any).autoTable({
        head: [[`Step ${step.step}: ${step.title} (${step.duration})`]],
        body: [[step.instruction]],
        startY: finalY + 10,
        theme: 'striped',
        headStyles: { fillColor: '#f3f4f6', textColor: '#111827' }
      });
      finalY = (doc as any).lastAutoTable.finalY;
    });
    
    doc.save(`${meditationResult.title.replace(/\s+/g, '_')}.pdf`);
  }

  const resetFlow = () => {
    form.reset({
      duration: 10,
      timeOfDay: 'morning',
      goals: [],
    });
    setMeditationResult(null);
    setCurrentStep(Steps.PREFERENCES);
  }

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -50 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  if (authLoading || initialLoading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {currentStep === Steps.PREFERENCES && (
          <motion.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit /> Personal Meditation Guide</CardTitle>
                <CardDescription>Let us know your goals, and our AI will create a guided meditation practice just for you.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meditation Duration: {field.value} minutes</FormLabel>
                          <FormControl>
                            <Slider
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              min={5} max={60} step={5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeOfDay"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Time of Day</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col sm:flex-row gap-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="morning" /></FormControl>
                                <FormLabel className="font-normal">Morning</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="afternoon" /></FormControl>
                                <FormLabel className="font-normal">Afternoon</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="evening" /></FormControl>
                                <FormLabel className="font-normal">Evening</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="goals"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">What are your goals for this session?</FormLabel>
                            <p className="text-sm text-muted-foreground">Select one or more.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {meditationGoals.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="goals"
                                render={({ field }) => (
                                  <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          const currentGoals = field.value || [];
                                          return checked
                                            ? field.onChange([...currentGoals, item.id])
                                            : field.onChange(currentGoals?.filter((value) => value !== item.id));
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={!profile}>
                      Generate Practice <MoveRight className="ml-2" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {currentStep === Steps.GENERATING && (
          <motion.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <CardTitle className="mt-6">Preparing your meditation...</CardTitle>
              <CardDescription className="mt-2">Our AI coach is finding your inner peace.</CardDescription>
            </Card>
          </motion.div>
        )}

        {currentStep === Steps.RESULT && meditationResult && (
           <motion.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">{meditationResult.title}</CardTitle>
                    <CardDescription className="text-center text-md pt-2">{meditationResult.summary}</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-8">
                     <div className="flex gap-2 justify-center flex-wrap">
                        {meditationResult.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                     <Alert>
                        <Sparkles className="h-4 w-4"/>
                        <AlertTitle>Benefits for You</AlertTitle>
                        <AlertDescription>
                           {meditationResult.benefits}
                        </AlertDescription>
                     </Alert>

                     <div>
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><BrainCircuit className="text-primary"/> Guided Practice</h3>
                        <div className="space-y-4">
                            {meditationResult.steps.map((step, i) => (
                                <Card key={i} className="p-4 bg-muted/50">
                                    <CardTitle className="text-lg flex justify-between items-center">
                                      <span>Step {step.step}: {step.title}</span>
                                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Timer size={16}/>{step.duration}</span>
                                    </CardTitle>
                                    <CardDescription className="pt-3">{step.instruction}</CardDescription>
                                </Card>
                            ))}
                        </div>
                    </div>
                 </CardContent>
                 <CardFooter className="flex-col sm:flex-row gap-2">
                    <Button onClick={resetFlow} variant="outline"><MoveLeft className="mr-2"/> New Practice</Button>
                    <Button onClick={handleDownloadPdf}><FileDown className="mr-2"/> Download PDF</Button>
                 </CardFooter>
            </Card>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
