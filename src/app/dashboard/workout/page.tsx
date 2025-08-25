
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, where, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Dumbbell, FileDown, Activity, Users, Clock, Flame, Shield, MoveRight, MoveLeft } from 'lucide-react';
import { generateWorkoutPlan, type WorkoutPlanOutput } from '@/ai/flows/workout-recommender';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const focusAreas = [
  { id: 'strength', label: 'Strength Training' },
  { id: 'cardio', label: 'Cardiovascular' },
  { id: 'flexibility', label: 'Flexibility & Mobility' },
  { id: 'balance', label: 'Balance & Stability' },
] as const;


const workoutSchema = z.object({
  workoutDuration: z.number().min(10, "Duration must be at least 10 minutes.").max(120, "Duration must be less than 120 minutes."),
  location: z.enum(['home', 'gym'], { required_error: 'Please select a location.' }),
  focusAreas: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one focus area.',
  }),
});

type WorkoutFormData = z.infer<typeof workoutSchema>;

const Steps = {
  PREFERENCES: 1,
  GENERATING: 2,
  RESULT: 3,
};

export default function WorkoutPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);
  const [workoutResult, setWorkoutResult] = useState<WorkoutPlanOutput | null>(null);
  const [currentStep, setCurrentStep] = useState(Steps.PREFERENCES);

  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      workoutDuration: 30,
      location: 'home',
      focusAreas: [],
    },
  });

  const fetchUserData = useCallback(async () => {
    if (user) {
      setInitialLoading(true);
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        } else {
          toast({
            variant: 'destructive',
            title: 'Profile Required',
            description: 'Please complete your user profile first.',
          });
        }

        const reportsQuery = query(
          collection(db, 'health-reports'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const reportSnapshot = await getDocs(reportsQuery);
        if (!reportSnapshot.empty) {
          setLatestHealthReport(reportSnapshot.docs[0].data());
        }
        
      } catch (e:any) {
        toast({ title: 'Error', description: 'Failed to fetch user data.', variant: 'destructive' });
      } finally {
        setInitialLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    }
  }, [user, authLoading, fetchUserData]);

  async function onSubmit(values: WorkoutFormData) {
    if (!profile) {
      toast({ title: 'Error', description: 'User profile is not loaded.', variant: 'destructive' });
      return;
    }
    setCurrentStep(Steps.GENERATING);
    try {
      const result = await generateWorkoutPlan({
        ...values,
        userProfile: JSON.stringify(profile),
        latestHealthReport: latestHealthReport ? JSON.stringify(latestHealthReport) : undefined,
      });
      setWorkoutResult(result);
      setCurrentStep(Steps.RESULT);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      setCurrentStep(Steps.PREFERENCES);
    }
  }

  function handleDownloadPdf() {
    if (!workoutResult) return;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let finalY = 0;

    doc.setFontSize(22);
    doc.text(workoutResult.planTitle, 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(workoutResult.planSummary, 180);
    doc.text(summaryLines, 105, 30, { align: 'center' });

    (doc as any).autoTable({
        head: [['Important Notes & Safety Considerations']],
        body: [[workoutResult.notes]],
        startY: 45,
        theme: 'grid',
        styles: { fillColor: [255, 251, 235] }
    });
    finalY = (doc as any).lastAutoTable.finalY;

    const addSection = (title: string, exercises: any[]) => {
      if (finalY > pageHeight - 40) doc.addPage();
      (doc as any).autoTable({
        head: [[title]],
        startY: finalY + 10,
        theme: 'grid',
        didParseCell: function(data: any) {
          if (data.section === 'head') {
              data.cell.styles.fillColor = '#f3f4f6';
              data.cell.styles.textColor = '#111827';
          }
        },
      });
      
      const rows = exercises.map(ex => [ex.name, `${ex.sets} x ${ex.reps}`, ex.rest, ex.description]);
      (doc as any).autoTable({
        head: [['Exercise', 'Sets/Reps', 'Rest', 'Description']],
        body: rows,
        startY: (doc as any).lastAutoTable.finalY,
        theme: 'striped',
      });
       finalY = (doc as any).lastAutoTable.finalY;
    }

    addSection('Warm-Up', workoutResult.warmUp);
    addSection('Main Workout', workoutResult.mainWorkout);
    addSection('Cool-Down', workoutResult.coolDown);
    
    doc.save(`${workoutResult.planTitle.replace(/\s+/g, '_')}.pdf`);
  }

  const resetFlow = () => {
    form.reset();
    setWorkoutResult(null);
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
                <CardTitle className="flex items-center gap-2"><Dumbbell /> Your Personalized Workout</CardTitle>
                <CardDescription>Tell us your preferences, and our AI will create a safe and effective workout plan based on your unique health profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <FormField
                      control={form.control}
                      name="workoutDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workout Duration: {field.value} minutes</FormLabel>
                          <FormControl>
                            <Slider
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              min={10} max={120} step={5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="home" /></FormControl>
                                <FormLabel className="font-normal">Home</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="gym" /></FormControl>
                                <FormLabel className="font-normal">Gym</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="focusAreas"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Focus Areas</FormLabel>
                            <p className="text-sm text-muted-foreground">Select one or more areas to focus on.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {focusAreas.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="focusAreas"
                                render={({ field }) => (
                                  <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(field.value?.filter((value) => value !== item.id));
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
                      Generate Workout Plan <MoveRight className="ml-2" />
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
              <CardTitle className="mt-6">Building your workout plan...</CardTitle>
              <CardDescription className="mt-2">Our AI coach is personalizing your session!</CardDescription>
            </Card>
          </motion.div>
        )}

        {currentStep === Steps.RESULT && workoutResult && (
           <motion.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">{workoutResult.planTitle}</CardTitle>
                    <CardDescription className="text-center text-md pt-2">{workoutResult.planSummary}</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-8">
                     <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-md">
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-2"><Shield /> Safety Notes</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">{workoutResult.notes}</p>
                    </div>

                    {[
                        {title: 'Warm-Up', icon: Flame, exercises: workoutResult.warmUp},
                        {title: 'Main Workout', icon: Activity, exercises: workoutResult.mainWorkout},
                        {title: 'Cool-Down', icon: Users, exercises: workoutResult.coolDown}
                    ].map(section => (
                       section.exercises.length > 0 && <div key={section.title}>
                            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><section.icon className="text-primary"/> {section.title}</h3>
                            <div className="space-y-4">
                                {section.exercises.map((ex, i) => (
                                    <div key={i} className="p-4 bg-muted/50 rounded-lg">
                                        <h4 className="font-semibold">{ex.name}</h4>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                                            <span><strong>Sets:</strong> {ex.sets}</span>
                                            <span><strong>Reps:</strong> {ex.reps}</span>
                                            <span><strong>Rest:</strong> {ex.rest}</span>
                                        </div>
                                        <p className="text-sm mt-2">{ex.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                 </CardContent>
                 <CardFooter className="flex-col sm:flex-row gap-2">
                    <Button onClick={resetFlow} variant="outline"><MoveLeft className="mr-2"/> Generate Another</Button>
                    <Button onClick={handleDownloadPdf}><FileDown className="mr-2"/> Download PDF</Button>
                 </CardFooter>
            </Card>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
