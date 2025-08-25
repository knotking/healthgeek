
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Common History Imports
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, ChefHat, Dumbbell, History, Loader2 as Loader2History, Save, Eye, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


// Recipe Generator Imports
import { useState as useStateRecipe, useEffect as useEffectRecipe, useCallback as useCallbackRecipe } from 'react';
import { useForm as useFormRecipe } from 'react-hook-form';
import { zodResolver as zodResolverRecipe } from '@hookform/resolvers/zod';
import { z as zRecipe } from 'zod';
import { useAuthState as useAuthStateRecipe } from 'react-firebase-hooks/auth';
import { auth as authRecipe, db as dbRecipe } from '@/lib/firebase';
import { doc as docRecipe, getDoc as getDocRecipe } from 'firebase/firestore';
import { Button as ButtonRecipe } from '@/components/ui/button';
import { CardFooter as CardFooterRecipe } from '@/components/ui/card';
import { Badge as BadgeRecipe } from '@/components/ui/badge';
import { useToast as useToastRecipe } from '@/hooks/use-toast';
import { Loader2 as Loader2Recipe, CookingPot, FileDown as FileDownRecipe, Utensils, Clock, User, Sparkles as SparklesRecipe, MoveRight as MoveRightRecipe, MoveLeft as MoveLeftRecipe } from 'lucide-react';
import { generateSingleRecipe, SingleRecipeOutput } from '@/ai/flows/conversational-recipe-generator';
import { Form as FormRecipe, FormControl as FormControlRecipe, FormField as FormFieldRecipe, FormItem as FormItemRecipe, FormLabel as FormLabelRecipe, FormMessage as FormMessageRecipe } from '@/components/ui/form';
import { Input as InputRecipe } from '@/components/ui/input';
import { Textarea as TextareaRecipe } from '@/components/ui/textarea';
import { Select as SelectRecipe, SelectContent as SelectContentRecipe, SelectItem as SelectItemRecipe, SelectTrigger as SelectTriggerRecipe, SelectValue as SelectValueRecipe } from '@/components/ui/select';
import { AnimatePresence as AnimatePresenceRecipe, motion as motionRecipe } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Workout Generator Imports
import { useState as useStateWorkout, useEffect as useEffectWorkout, useCallback as useCallbackWorkout } from 'react';
import { useForm as useFormWorkout } from 'react-hook-form';
import { zodResolver as zodResolverWorkout } from '@hookform/resolvers/zod';
import { z as zWorkout } from 'zod';
import { useAuthState as useAuthStateWorkout } from 'react-firebase-hooks/auth';
import { auth as authWorkout, db as dbWorkout } from '@/lib/firebase';
import { doc as docWorkout, getDoc as getDocWorkout, collection as collectionWorkout, query as queryWorkout, orderBy as orderByWorkout, where as whereWorkout, limit as limitWorkout, getDocs as getDocsWorkout } from 'firebase/firestore';
import { Button as ButtonWorkout } from '@/components/ui/button';
import { CardFooter as CardFooterWorkout } from '@/components/ui/card';
import { Badge as BadgeWorkout } from '@/components/ui/badge';
import { useToast as useToastWorkout } from '@/hooks/use-toast';
import { Loader2 as Loader2Workout, FileDown as FileDownWorkout, Activity, Shield, MoveRight as MoveRightWorkout, MoveLeft as MoveLeftWorkout, Repeat, Target, Timer as TimerWorkout, HeartPulse } from 'lucide-react';
import { generateWorkoutPlan, type WorkoutPlanOutput } from '@/ai/flows/workout-recommender';
import { Form as FormWorkout, FormControl as FormControlWorkout, FormField as FormFieldWorkout, FormItem as FormItemWorkout, FormLabel as FormLabelWorkout, FormMessage as FormMessageWorkout } from '@/components/ui/form';
import { RadioGroup as RadioGroupWorkout, RadioGroupItem as RadioGroupItemWorkout } from '@/components/ui/radio-group';
import { Slider as SliderWorkout } from '@/components/ui/slider';
import { Checkbox as CheckboxWorkout } from '@/components/ui/checkbox';
import { AnimatePresence as AnimatePresenceWorkout, motion as motionWorkout } from 'framer-motion';
import { Alert as AlertWorkout, AlertDescription as AlertDescriptionWorkout, AlertTitle as AlertTitleWorkout } from '@/components/ui/alert';

// Meditation Generator Imports
import { useState as useStateMeditation, useEffect as useEffectMeditation, useCallback as useCallbackMeditation } from 'react';
import { useForm as useFormMeditation } from 'react-hook-form';
import { zodResolver as zodResolverMeditation } from '@hookform/resolvers/zod';
import { z as zMeditation } from 'zod';
import { useAuthState as useAuthStateMeditation } from 'react-firebase-hooks/auth';
import { auth as authMeditation, db as dbMeditation } from '@/lib/firebase';
import { doc as docMeditation, getDoc as getDocMeditation } from 'firebase/firestore';
import { Button as ButtonMeditation } from '@/components/ui/button';
import { CardFooter as CardFooterMeditation } from '@/components/ui/card';
import { Badge as BadgeMeditation } from '@/components/ui/badge';
import { useToast as useToastMeditation } from '@/hooks/use-toast';
import { Loader2 as Loader2Meditation, FileDown as FileDownMeditation, MoveRight as MoveRightMeditation, MoveLeft as MoveLeftMeditation, Sparkles as SparklesMeditation, Timer as TimerMeditation } from 'lucide-react';
import { generateMeditationPractice, type MeditationPracticeOutput } from '@/ai/flows/meditation-recommender';
import { Form as FormMeditation, FormControl as FormControlMeditation, FormField as FormFieldMeditation, FormItem as FormItemMeditation, FormLabel as FormLabelMeditation, FormMessage as FormMessageMeditation } from '@/components/ui/form';
import { RadioGroup as RadioGroupMeditation, RadioGroupItem as RadioGroupItemMeditation } from '@/components/ui/radio-group';
import { Slider as SliderMeditation } from '@/components/ui/slider';
import { Checkbox as CheckboxMeditation } from '@/components/ui/checkbox';
import { AnimatePresence as AnimatePresenceMeditation, motion as motionMeditation } from 'framer-motion';
import { Alert as AlertMeditation, AlertDescription as AlertDescriptionMeditation, AlertTitle as AlertTitleMeditation } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type RecommendationType = 'recipe' | 'workout' | 'meditation';

type RecommendationHistoryItem = {
    id: string;
    timestamp: Date;
    type: RecommendationType;
    data: any;
};

// --- Recipe Component ---
const recipeSchema = zRecipe.object({
  mealType: zRecipe.string().min(1, "Please select a meal type."),
  cuisine: zRecipe.string().min(2, "Please enter a cuisine style."),
  ingredientsToInclude: zRecipe.string().optional(),
  ingredientsToExclude: zRecipe.string().optional(),
  dietaryNotes: zRecipe.string().optional(),
});
type RecipeFormData = zRecipe.infer<typeof recipeSchema>;
const RecipeSteps = { PREFERENCES: 1, GENERATING: 2, RESULT: 3 };

function RecipeGeneratorTab({ onSave, initialData, isVisible }: { onSave: () => void; initialData?: SingleRecipeOutput | null; isVisible: boolean }) {
  const [user, authLoading] = useAuthStateRecipe(authRecipe);
  const { toast } = useToastRecipe();
  const [loading, setLoading] = useStateRecipe(true);
  const [isSaving, setIsSaving] = useStateRecipe(false);
  const [profile, setProfile] = useStateRecipe<any>(null);
  const [recipeResult, setRecipeResult] = useStateRecipe<SingleRecipeOutput | null>(initialData || null);
  const [currentStep, setCurrentStep] = useStateRecipe(initialData ? RecipeSteps.RESULT : RecipeSteps.PREFERENCES);

  useEffectRecipe(() => {
    if (initialData) {
      setRecipeResult(initialData);
      setCurrentStep(RecipeSteps.RESULT);
    }
  }, [initialData]);

  useEffectRecipe(() => {
    if (!isVisible) {
      setRecipeResult(null);
      setCurrentStep(RecipeSteps.PREFERENCES);
      form.reset();
    }
  }, [isVisible]);

  const form = useFormRecipe<RecipeFormData>({
    resolver: zodResolverRecipe(recipeSchema),
    defaultValues: { mealType: '', cuisine: '', ingredientsToInclude: '', ingredientsToExclude: '', dietaryNotes: '' },
  });

  const fetchUserData = useCallbackRecipe(async () => {
    if (user) {
      try {
        const docRef = docRecipe(dbRecipe, 'profiles', user.uid);
        const docSnap = await getDocRecipe(docRef);
        if (docSnap.exists()) setProfile(docSnap.data());
        else toast({ variant: 'destructive', title: 'Profile Required', description: 'Please complete your user profile first.' });
      } catch (e: any) {
        console.error("Failed to fetch user data:", e);
        toast({ title: "Profile Fetch Failed", description: "Could not load your profile.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffectRecipe(() => {
    if (!authLoading && user) fetchUserData();
    else if (!authLoading && !user) setLoading(false);
  }, [user, authLoading, fetchUserData]);

  async function onSubmit(values: RecipeFormData) {
    if (!profile || !user) {
      toast({ title: 'Error', description: 'User profile is not loaded.', variant: 'destructive' });
      return;
    }
    setCurrentStep(RecipeSteps.GENERATING);
    try {
      const result = await generateSingleRecipe({ ...values, userProfile: JSON.stringify(profile) });
      setRecipeResult(result);
      setCurrentStep(RecipeSteps.RESULT);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      setCurrentStep(RecipeSteps.PREFERENCES);
    }
  }

  async function handleSave() {
    if (!user || !recipeResult) return;
    setIsSaving(true);
    try {
        await addDoc(collection(dbRecipe, 'recommendation-history'), {
            userId: user.uid,
            timestamp: new Date(),
            type: 'recipe',
            data: recipeResult
        });
        toast({ title: 'Recipe Saved', description: 'This recipe has been saved to your history.'});
        onSave();
    } catch(e: any) {
        toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  }

  function handleDownloadPdf(recipeData: SingleRecipeOutput) {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(22);
    doc.text(recipeData.name, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(recipeData.description, 105, 30, { align: 'center', maxWidth: 180 });
    (doc as any).autoTable({
        head: [['Details', '']],
        body: [['Prep Time', recipeData.prepTime], ['Cook Time', recipeData.cookTime], ['Servings', recipeData.servings], ['Health Focus', recipeData.healthFocus]],
        startY: 40, theme: 'grid',
    });
    const finalY = (doc as any).lastAutoTable.finalY;
    (doc as any).autoTable({
        head: [['Ingredients']], body: recipeData.ingredients.map(i => [i]),
        startY: finalY + 10, theme: 'striped',
    });
    const finalY2 = (doc as any).lastAutoTable.finalY;
    (doc as any).autoTable({
        head: [['Instructions']], body: recipeData.instructions.map((step, i) => [`${i + 1}. ${step}`]),
        startY: finalY2 + 10, theme: 'striped',
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Powered by HealthGeek - © ${new Date().getFullYear()} HealthGeek. All rights reserved.`,
            105,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    doc.save(`${recipeData.name.replace(/\s+/g, '_')}.pdf`);
  }

  const resetFlow = () => {
    form.reset();
    setRecipeResult(null);
    setCurrentStep(RecipeSteps.PREFERENCES);
  }

  if (!isVisible && !recipeResult) {
      return null;
  }

  const pageVariants = { initial: { opacity: 0, x: 50 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -50 } };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

  if (authLoading || (loading && !profile)) return <div className="flex justify-center py-6"><Loader2Recipe className="h-8 w-8 animate-spin" /></div>;

  return (
    <AnimatePresenceRecipe mode="wait">
      {currentStep === RecipeSteps.PREFERENCES && (
        <motionRecipe.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ChefHat /> Create Your Perfect Recipe</CardTitle>
              <CardDescription>Tell us what you're in the mood for, and we'll generate a personalized recipe just for you.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormRecipe {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormFieldRecipe control={form.control} name="mealType" render={({ field }) => (
                      <FormItemRecipe><FormLabelRecipe>Meal Type</FormLabelRecipe><SelectRecipe onValueChange={field.onChange} defaultValue={field.value}><FormControlRecipe><SelectTriggerRecipe><SelectValueRecipe placeholder="Select a meal type..." /></SelectTriggerRecipe></FormControlRecipe><SelectContentRecipe><SelectItemRecipe value="Breakfast">Breakfast</SelectItemRecipe><SelectItemRecipe value="Lunch">Lunch</SelectItemRecipe><SelectItemRecipe value="Dinner">Dinner</SelectItemRecipe><SelectItemRecipe value="Snack">Snack</SelectItemRecipe><SelectItemRecipe value="Dessert">Dessert</SelectItemRecipe><SelectItemRecipe value="Beverage">Beverage</SelectItemRecipe></SelectContentRecipe></SelectRecipe><FormMessageRecipe /></FormItemRecipe>
                    )} />
                    <FormFieldRecipe control={form.control} name="cuisine" render={({ field }) => (
                      <FormItemRecipe><FormLabelRecipe>Cuisine Style</FormLabelRecipe><FormControlRecipe><InputRecipe placeholder="e.g., Italian, Mexican, Thai" {...field} /></FormControlRecipe><FormMessageRecipe /></FormItemRecipe>
                    )} />
                  </div>
                  <FormFieldRecipe control={form.control} name="ingredientsToInclude" render={({ field }) => (
                    <FormItemRecipe><FormLabelRecipe>Ingredients to Include (optional)</FormLabelRecipe><FormControlRecipe><InputRecipe placeholder="e.g., chicken, broccoli, quinoa" {...field} /></FormControlRecipe><FormMessageRecipe /></FormItemRecipe>
                  )} />
                  <FormFieldRecipe control={form.control} name="ingredientsToExclude" render={({ field }) => (
                    <FormItemRecipe><FormLabelRecipe>Ingredients to Exclude (optional)</FormLabelRecipe><FormControlRecipe><InputRecipe placeholder="e.g., mushrooms, nuts" {...field} /></FormControlRecipe><FormMessageRecipe /></FormItemRecipe>
                  )} />
                   <FormFieldRecipe control={form.control} name="dietaryNotes" render={({ field }) => (
                    <FormItemRecipe><FormLabelRecipe>Other Dietary Notes (optional)</FormLabelRecipe><FormControlRecipe><TextareaRecipe placeholder="e.g., low-fodmap, extra spicy, for kids..." {...field} /></FormControlRecipe><FormMessageRecipe /></FormItemRecipe>
                  )} />
                  <ButtonRecipe type="submit" disabled={!profile}>Generate Recipe <MoveRightRecipe className="ml-2" /></ButtonRecipe>
                </form>
              </FormRecipe>
            </CardContent>
          </Card>
        </motionRecipe.div>
      )}
      {currentStep === RecipeSteps.GENERATING && (
        <motionRecipe.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card className="flex flex-col items-center justify-center py-24"><Loader2Recipe className="h-16 w-16 animate-spin text-primary" /><CardTitle className="mt-6">Crafting your recipe...</CardTitle><CardDescription className="mt-2">Our AI chef is at work!</CardDescription></Card>
        </motionRecipe.div>
      )}
      {currentStep === RecipeSteps.RESULT && recipeResult && (
         <motionRecipe.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card>
              <CardHeader><CardTitle className="text-3xl font-bold text-center">{recipeResult.name}</CardTitle><CardDescription className="text-center text-md pt-2">{recipeResult.description}</CardDescription></CardHeader>
               <CardContent className="space-y-8">
                   <div className="flex gap-2 justify-center flex-wrap">{recipeResult.tags.map(tag => <BadgeRecipe key={tag} variant="secondary">{tag}</BadgeRecipe>)}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-muted p-3 rounded-lg"><h4 className="font-semibold text-sm">Prep Time</h4><p className="text-lg flex items-center justify-center gap-1"><Clock className="h-4 w-4"/> {recipeResult.prepTime}</p></div>
                      <div className="bg-muted p-3 rounded-lg"><h4 className="font-semibold text-sm">Cook Time</h4><p className="text-lg flex items-center justify-center gap-1"><Clock className="h-4 w-4"/> {recipeResult.cookTime}</p></div>
                      <div className="bg-muted p-3 rounded-lg"><h4 className="font-semibold text-sm">Servings</h4><p className="text-lg flex items-center justify-center gap-1"><User className="h-4 w-4"/>{recipeResult.servings}</p></div>
                      <div className="bg-muted p-3 rounded-lg"><h4 className="font-semibold text-sm">Health Focus</h4><p className="text-md flex items-center justify-center gap-1"><SparklesRecipe className="h-4 w-4 text-primary"/>{recipeResult.healthFocus}</p></div>
                  </div>
                  <div className="grid md:grid-cols-5 gap-8">
                      <div className="md:col-span-2"><h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Utensils /> Ingredients</h3><ul className="space-y-2 text-muted-foreground">{recipeResult.ingredients.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1.5">&#8226;</span><span>{item}</span></li>)}</ul></div>
                      <div className="md:col-span-3"><h3 className="font-bold text-xl mb-4 flex items-center gap-2"><CookingPot /> Instructions</h3><ol className="space-y-4 text-muted-foreground">{recipeResult.instructions.map((step, i) => <li key={i} className="flex items-start"><span className="font-bold text-primary mr-3">{i + 1}.</span><span>{step}</span></li>)}</ol></div>
                  </div>
               </CardContent>
               <CardFooterRecipe className="flex-col sm:flex-row gap-2 justify-center">
                    <ButtonRecipe onClick={resetFlow} variant="outline"><MoveLeftRecipe className="mr-2"/> Generate Another</ButtonRecipe>
                    <ButtonRecipe onClick={() => handleDownloadPdf(recipeResult)}><FileDownRecipe className="mr-2"/> Download PDF</ButtonRecipe>
                    <ButtonRecipe onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2Recipe className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        Save to History
                    </ButtonRecipe>
                </CardFooterRecipe>
          </Card>
         </motionRecipe.div>
      )}
    </AnimatePresenceRecipe>
  );
}

// --- Workout Component ---
const focusAreas = [{ id: 'strength', label: 'Strength Training' }, { id: 'cardio', label: 'Cardiovascular' }, { id: 'flexibility', label: 'Flexibility & Mobility' }, { id: 'balance', label: 'Balance & Stability' }] as const;
const workoutSchema = zWorkout.object({
  workoutDuration: zWorkout.number().min(10, "Duration must be at least 10 minutes.").max(120, "Duration must be less than 120 minutes."),
  location: zWorkout.enum(['home', 'gym'], { required_error: 'Please select a location.' }),
  focusAreas: zWorkout.array(zWorkout.string()).refine((value) => value.some((item) => item), { message: 'You have to select at least one focus area.' }),
});
type WorkoutFormData = zWorkout.infer<typeof workoutSchema>;
const WorkoutSteps = { PREFERENCES: 1, GENERATING: 2, RESULT: 3 };

function WorkoutGeneratorTab({ onSave, initialData, isVisible }: { onSave: () => void; initialData?: WorkoutPlanOutput | null, isVisible: boolean }) {
  const [user, authLoading] = useAuthStateWorkout(authWorkout);
  const { toast } = useToastWorkout();
  const [initialLoading, setInitialLoading] = useStateWorkout(true);
  const [isSaving, setIsSaving] = useStateWorkout(false);
  const [profile, setProfile] = useStateWorkout<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useStateWorkout<any>(null);
  const [workoutResult, setWorkoutResult] = useStateWorkout<WorkoutPlanOutput | null>(initialData || null);
  const [currentStep, setCurrentStep] = useStateWorkout(initialData ? WorkoutSteps.RESULT : WorkoutSteps.PREFERENCES);

  useEffectWorkout(() => {
    if (initialData) {
      setWorkoutResult(initialData);
      setCurrentStep(WorkoutSteps.RESULT);
    }
  }, [initialData]);

   useEffectWorkout(() => {
    if (!isVisible) {
      setWorkoutResult(null);
      setCurrentStep(WorkoutSteps.PREFERENCES);
      form.reset();
    }
  }, [isVisible]);

  const form = useFormWorkout<WorkoutFormData>({
    resolver: zodResolverWorkout(workoutSchema),
    defaultValues: { workoutDuration: 30, location: 'home', focusAreas: [] },
  });

  const fetchUserData = useCallbackWorkout(async () => {
    if (user) {
      try {
        const profileRef = docWorkout(dbWorkout, 'profiles', user.uid);
        const profileSnap = await getDocWorkout(profileRef);
        if (profileSnap.exists()) setProfile(profileSnap.data());
        else toast({ variant: 'destructive', title: 'Profile Required', description: 'Please complete your user profile first.' });

        const reportsQuery = queryWorkout(collectionWorkout(dbWorkout, 'health-reports'), whereWorkout('userId', '==', user.uid), orderByWorkout('timestamp', 'desc'), limitWorkout(1));
        const reportSnapshot = await getDocsWorkout(reportsQuery);
        if (!reportSnapshot.empty) setLatestHealthReport(reportSnapshot.docs[0].data());
      } catch (e: any) {
        toast({ title: "Data Fetch Failed", description: "Could not load your user data.", variant: "destructive" });
      } finally {
        setInitialLoading(false);
      }
    }
  }, [user, toast]);

  useEffectWorkout(() => {
    if (!authLoading && user) fetchUserData();
    else if (!authLoading && !user) setInitialLoading(false);
  }, [user, authLoading, fetchUserData]);
  
  async function onSubmit(values: WorkoutFormData) {
    if (!profile || !user) {
      toast({ title: 'Error', description: 'User profile is not loaded.', variant: 'destructive' });
      return;
    }
    setCurrentStep(WorkoutSteps.GENERATING);
    try {
      const result = await generateWorkoutPlan({ ...values, userProfile: JSON.stringify(profile), latestHealthReport: latestHealthReport ? JSON.stringify(latestHealthReport) : undefined });
      setWorkoutResult(result);
      setCurrentStep(WorkoutSteps.RESULT);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      setCurrentStep(WorkoutSteps.PREFERENCES);
    }
  }

  async function handleSave() {
    if (!user || !workoutResult) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'recommendation-history'), {
        userId: user.uid,
        timestamp: new Date(),
        type: 'workout',
        data: workoutResult,
      });
      toast({ title: 'Workout Saved', description: 'This workout has been saved to your history.' });
      onSave();
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownloadPdf() {
    if (!workoutResult) return;
    const doc = new jsPDF();
    let finalY = 0;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(22);
    doc.text(workoutResult.planTitle, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(workoutResult.planSummary, 180);
    doc.text(summaryLines, 105, 30, { align: 'center' });
    
    (doc as any).autoTable({
        head: [['Important Notes & Safety Considerations']], body: [[workoutResult.notes]],
        startY: 45, theme: 'grid', styles: { fillColor: [255, 251, 235] }
    });
    finalY = (doc as any).lastAutoTable.finalY;

    const addSection = (title: string, exercises: any[]) => {
      if (exercises.length === 0) return;
      if (finalY > pageHeight - 40) doc.addPage();
      (doc as any).autoTable({
        head: [[title]], startY: finalY + 10, theme: 'grid',
        didParseCell: function(data: any) { if (data.section === 'head') { data.cell.styles.fillColor = '#f3f4f6'; data.cell.styles.textColor = '#111827'; } },
      });
      const rows = exercises.map(ex => [ex.name, `${ex.sets} x ${ex.reps}`, ex.rest, ex.description]);
      (doc as any).autoTable({
        head: [['Exercise', 'Sets/Reps', 'Rest', 'Description']], body: rows,
        startY: (doc as any).lastAutoTable.finalY, theme: 'striped',
      });
       finalY = (doc as any).lastAutoTable.finalY;
    }
    
    addSection('Warm-Up', workoutResult.warmUp);
    addSection('Main Workout', workoutResult.mainWorkout);
    addSection('Cool-Down', workoutResult.coolDown);
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Powered by HealthGeek - © ${new Date().getFullYear()} HealthGeek. All rights reserved.`,
            105,
            pageHeight - 10,
            { align: 'center' }
        );
    }
    
    doc.save(`${workoutResult.planTitle.replace(/\s+/g, '_')}.pdf`);
  }

  const resetFlow = () => {
    form.reset({ workoutDuration: 30, location: 'home', focusAreas: [] });
    setWorkoutResult(null);
    setCurrentStep(WorkoutSteps.PREFERENCES);
  }

  if (!isVisible && !workoutResult) {
      return null;
  }

  const pageVariants = { initial: { opacity: 0, x: 50 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -50 } };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

  if (authLoading || initialLoading) return <div className="flex justify-center py-6"><Loader2Workout className="h-8 w-8 animate-spin" /></div>;

  return (
    <AnimatePresenceWorkout mode="wait">
      {currentStep === WorkoutSteps.PREFERENCES && (
        <motionWorkout.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Dumbbell /> Your Personalized Workout</CardTitle>
              <CardDescription>Tell us your preferences, and our AI will create a safe and effective workout plan based on your unique health profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormWorkout {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                   <FormFieldWorkout control={form.control} name="workoutDuration" render={({ field }) => (
                    <FormItemWorkout><FormLabelWorkout>Workout Duration: {field.value} minutes</FormLabelWorkout><FormControlWorkout><SliderWorkout value={[field.value]} onValueChange={(vals) => field.onChange(vals[0])} min={10} max={120} step={5} /></FormControlWorkout><FormMessageWorkout /></FormItemWorkout>
                  )} />
                  <FormFieldWorkout control={form.control} name="location" render={({ field }) => (
                    <FormItemWorkout className="space-y-3"><FormLabelWorkout>Location</FormLabelWorkout><FormControlWorkout><RadioGroupWorkout onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItemWorkout className="flex items-center space-x-2 space-y-0"><FormControlWorkout><RadioGroupItemWorkout value="home" /></FormControlWorkout><FormLabelWorkout className="font-normal">Home</FormLabelWorkout></FormItemWorkout><FormItemWorkout className="flex items-center space-x-2 space-y-0"><FormControlWorkout><RadioGroupItemWorkout value="gym" /></FormControlWorkout><FormLabelWorkout className="font-normal">Gym</FormLabelWorkout></FormItemWorkout></RadioGroupWorkout></FormControlWorkout><FormMessageWorkout /></FormItemWorkout>
                  )} />
                  <FormFieldWorkout control={form.control} name="focusAreas" render={() => (
                    <FormItemWorkout>
                      <div className="mb-4"><FormLabelWorkout className="text-base">Focus Areas</FormLabelWorkout><p className="text-sm text-muted-foreground">Select one or more areas to focus on.</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        {focusAreas.map((item) => (
                          <FormFieldWorkout key={item.id} control={form.control} name="focusAreas" render={({ field }) => (
                            <FormItemWorkout key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControlWorkout><CheckboxWorkout checked={field.value?.includes(item.id)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id)); }} /></FormControlWorkout><FormLabelWorkout className="font-normal">{item.label}</FormLabelWorkout></FormItemWorkout>
                          )} />
                        ))}
                      </div><FormMessageWorkout />
                    </FormItemWorkout>
                  )} />
                  <ButtonWorkout type="submit" disabled={!profile}>Generate Workout Plan <MoveRightWorkout className="ml-2" /></ButtonWorkout>
                </form>
              </FormWorkout>
            </CardContent>
          </Card>
        </motionWorkout.div>
      )}
      {currentStep === WorkoutSteps.GENERATING && (
        <motionWorkout.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card className="flex flex-col items-center justify-center py-24"><Loader2Workout className="h-16 w-16 animate-spin text-primary" /><CardTitle className="mt-6">Building your workout plan...</CardTitle><CardDescription className="mt-2">Our AI coach is personalizing your session!</CardDescription></Card>
        </motionWorkout.div>
      )}
      {currentStep === WorkoutSteps.RESULT && workoutResult && (
         <motionWorkout.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card>
              <CardHeader><CardTitle className="text-3xl font-bold text-center">{workoutResult.planTitle}</CardTitle><CardDescription className="text-center text-md pt-2">{workoutResult.planSummary}</CardDescription></CardHeader>
               <CardContent className="space-y-8">
                   <div className="flex gap-2 justify-center flex-wrap">{workoutResult.tags.map(tag => <BadgeWorkout key={tag} variant="secondary">{tag}</BadgeWorkout>)}</div>
                   <AlertWorkout variant="destructive"><Shield className="h-4 w-4"/><AlertTitleWorkout>Safety First!</AlertTitleWorkout><AlertDescriptionWorkout>{workoutResult.notes}</AlertDescriptionWorkout></AlertWorkout>
                  {[{title: 'Warm-Up', icon: Activity, exercises: workoutResult.warmUp}, {title: 'Main Workout', icon: Dumbbell, exercises: workoutResult.mainWorkout}, {title: 'Cool-Down', icon: HeartPulse, exercises: workoutResult.coolDown}].map(section => (
                     section.exercises.length > 0 && <div key={section.title}>
                          <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><section.icon className="text-primary"/> {section.title}</h3>
                          <div className="space-y-4">
                              {section.exercises.map((ex, i) => (
                                  <Card key={i} className="p-4 bg-muted/50">
                                      <CardTitle className="text-lg">{ex.name}</CardTitle>
                                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-3 mb-3">
                                          <div className="flex items-center gap-1.5"><Repeat/> <strong>Sets:</strong> {ex.sets}</div>
                                          <div className="flex items-center gap-1.5"><Target/> <strong>Reps:</strong> {ex.reps}</div>
                                          <div className="flex items-center gap-1.5"><TimerWorkout/> <strong>Rest:</strong> {ex.rest}</div>
                                      </div>
                                      <CardDescription>{ex.description}</CardDescription>
                                  </Card>
                              ))}
                          </div>
                      </div>
                  ))}
               </CardContent>
               <CardFooterWorkout className="flex-col sm:flex-row gap-2 justify-center">
                    <ButtonWorkout onClick={resetFlow} variant="outline"><MoveLeftWorkout className="mr-2"/> New Workout</ButtonWorkout>
                    <ButtonWorkout onClick={handleDownloadPdf}><FileDownWorkout className="mr-2"/> Download PDF</ButtonWorkout>
                    <ButtonWorkout onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2Workout className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        Save to History
                    </ButtonWorkout>
                </CardFooterWorkout>
          </Card>
         </motionWorkout.div>
      )}
    </AnimatePresenceWorkout>
  );
}

// --- Meditation Component ---
const meditationGoals = [{ id: 'stress', label: 'Reduce Stress & Anxiety' }, { id: 'focus', label: 'Improve Focus' }, { id: 'sleep', label: 'Promote Better Sleep' }, { id: 'self-awareness', label: 'Increase Self-Awareness' }, { id: 'gratitude', label: 'Cultivate Gratitude' }] as const;
const meditationSchema = zMeditation.object({
  duration: zMeditation.number().min(5, "Duration must be at least 5 minutes.").max(60, "Duration must be less than 60 minutes."),
  timeOfDay: zMeditation.enum(['morning', 'afternoon', 'evening'], { required_error: 'Please select a time of day.' }),
  goals: zMeditation.array(zMeditation.string()).refine((value) => value.some((item) => item), { message: 'You have to select at least one goal.' }),
});
type MeditationFormData = zMeditation.infer<typeof meditationSchema>;
const MeditationSteps = { PREFERENCES: 1, GENERATING: 2, RESULT: 3 };

function MeditationGeneratorTab({ onSave, initialData, isVisible }: { onSave: () => void; initialData?: MeditationPracticeOutput | null, isVisible: boolean }) {
    const [user, authLoading] = useAuthStateMeditation(authMeditation);
    const { toast } = useToastMeditation();
    const [initialLoading, setInitialLoading] = useStateMeditation(true);
    const [isSaving, setIsSaving] = useStateMeditation(false);
    const [profile, setProfile] = useStateMeditation<any>(null);
    const [meditationResult, setMeditationResult] = useStateMeditation<MeditationPracticeOutput | null>(initialData || null);
    const [currentStep, setCurrentStep] = useStateMeditation(initialData ? MeditationSteps.RESULT : MeditationSteps.PREFERENCES);

    useEffectMeditation(() => {
        if (initialData) {
          setMeditationResult(initialData);
          setCurrentStep(MeditationSteps.RESULT);
        }
    }, [initialData]);

    useEffectMeditation(() => {
        if (!isVisible) {
          setMeditationResult(null);
          setCurrentStep(MeditationSteps.PREFERENCES);
          form.reset();
        }
    }, [isVisible]);

    const form = useFormMeditation<MeditationFormData>({
        resolver: zodResolverMeditation(meditationSchema),
        defaultValues: { duration: 10, timeOfDay: 'morning', goals: [] },
    });

    const fetchUserData = useCallbackMeditation(async () => {
        if (user) {
            try {
                const profileRef = docMeditation(dbMeditation, 'profiles', user.uid);
                const profileSnap = await getDocMeditation(profileRef);
                if (profileSnap.exists()) setProfile(profileSnap.data());
                else toast({ variant: 'destructive', title: 'Profile Required', description: 'Please complete your user profile first.' });
            } catch (e: any) {
                toast({ title: "Data Fetch Failed", description: "Could not load your user data.", variant: "destructive" });
            } finally {
                setInitialLoading(false);
            }
        }
    }, [user, toast]);

    useEffectMeditation(() => {
        if (!authLoading && user) fetchUserData();
        else if (!authLoading && !user) setInitialLoading(false);
    }, [user, authLoading, fetchUserData]);
    
    async function onSubmit(values: MeditationFormData) {
        if (!profile || !user) {
            toast({ title: 'Error', description: 'User profile is not loaded.', variant: 'destructive' });
            return;
        }
        setCurrentStep(MeditationSteps.GENERATING);
        try {
            const result = await generateMeditationPractice({ ...values, userProfile: JSON.stringify(profile) });
            setMeditationResult(result);
            setCurrentStep(MeditationSteps.RESULT);
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
            setCurrentStep(MeditationSteps.PREFERENCES);
        }
    }

    async function handleSave() {
        if (!user || !meditationResult) return;
        setIsSaving(true);
        try {
          await addDoc(collection(db, 'recommendation-history'), {
            userId: user.uid,
            timestamp: new Date(),
            type: 'meditation',
            data: meditationResult,
          });
          toast({ title: 'Meditation Saved', description: 'This practice has been saved to your history.' });
          onSave();
        } catch (e: any) {
          toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
        } finally {
          setIsSaving(false);
        }
      }

    function handleDownloadPdf() {
        if (!meditationResult) return;
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        let finalY = 0;
        
        doc.setFontSize(22);
        doc.text(meditationResult.title, 105, 20, { align: 'center' });
        doc.setFontSize(11);
        const summaryLines = doc.splitTextToSize(meditationResult.summary, 180);
        doc.text(summaryLines, 105, 30, { align: 'center' });
        
        (doc as any).autoTable({
            head: [['Benefits']], body: [[meditationResult.benefits]],
            startY: 45, theme: 'grid'
        });
        finalY = (doc as any).lastAutoTable.finalY;

        meditationResult.steps.forEach(step => {
            if (finalY > pageHeight - 40) doc.addPage();
            (doc as any).autoTable({
                head: [[`Step ${step.step}: ${step.title} (${step.duration})`]],
                body: [[step.instruction]],
                startY: finalY + 10, theme: 'striped',
                headStyles: { fillColor: '#f3f4f6', textColor: '#111827' }
            });
            finalY = (doc as any).lastAutoTable.finalY;
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Powered by HealthGeek - © ${new Date().getFullYear()} HealthGeek. All rights reserved.`,
                105,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        doc.save(`${meditationResult.title.replace(/\s+/g, '_')}.pdf`);
    }

    const resetFlow = () => {
        form.reset({ duration: 10, timeOfDay: 'morning', goals: [] });
        setMeditationResult(null);
        setCurrentStep(MeditationSteps.PREFERENCES);
    }
    
    if (!isVisible && !meditationResult) {
      return null;
    }

    const pageVariants = { initial: { opacity: 0, x: 50 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -50 } };
    const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

    if (authLoading || initialLoading) return <div className="flex justify-center py-6"><Loader2Meditation className="h-8 w-8 animate-spin" /></div>;

    return (
        <AnimatePresenceMeditation mode="wait">
            {currentStep === MeditationSteps.PREFERENCES && (
                <motionMeditation.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BrainCircuit /> Personal Meditation Guide</CardTitle>
                            <CardDescription>Let us know your goals, and our AI will create a guided meditation practice just for you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormMeditation {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                    <FormFieldMeditation control={form.control} name="duration" render={({ field }) => (
                                        <FormItemMeditation><FormLabelMeditation>Meditation Duration: {field.value} minutes</FormLabelMeditation><FormControlMeditation><SliderMeditation value={[field.value]} onValueChange={(vals) => field.onChange(vals[0])} min={5} max={60} step={5} /></FormControlMeditation><FormMessageMeditation /></FormItemMeditation>
                                    )} />
                                    <FormFieldMeditation control={form.control} name="timeOfDay" render={({ field }) => (
                                        <FormItemMeditation className="space-y-3"><FormLabelMeditation>Time of Day</FormLabelMeditation><FormControlMeditation>
                                            <RadioGroupMeditation onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row gap-4">
                                                <FormItemMeditation className="flex items-center space-x-2 space-y-0"><FormControlMeditation><RadioGroupItemMeditation value="morning" /></FormControlMeditation><FormLabelMeditation className="font-normal">Morning</FormLabelMeditation></FormItemMeditation>
                                                <FormItemMeditation className="flex items-center space-x-2 space-y-0"><FormControlMeditation><RadioGroupItemMeditation value="afternoon" /></FormControlMeditation><FormLabelMeditation className="font-normal">Afternoon</FormLabelMeditation></FormItemMeditation>
                                                <FormItemMeditation className="flex items-center space-x-2 space-y-0"><FormControlMeditation><RadioGroupItemMeditation value="evening" /></FormControlMeditation><FormLabelMeditation className="font-normal">Evening</FormLabelMeditation></FormItemMeditation>
                                            </RadioGroupMeditation>
                                        </FormControlMeditation><FormMessageMeditation /></FormItemMeditation>
                                    )} />
                                    <FormFieldMeditation control={form.control} name="goals" render={() => (
                                        <FormItemMeditation>
                                            <div className="mb-4"><FormLabelMeditation className="text-base">What are your goals for this session?</FormLabelMeditation><p className="text-sm text-muted-foreground">Select one or more.</p></div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {meditationGoals.map((item) => (
                                                    <FormFieldMeditation key={item.id} control={form.control} name="goals" render={({ field }) => (
                                                        <FormItemMeditation key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControlMeditation><CheckboxMeditation checked={field.value?.includes(item.id)} onCheckedChange={(checked) => { const currentGoals = field.value || []; return checked ? field.onChange([...currentGoals, item.id]) : field.onChange(currentGoals?.filter((value) => value !== item.id)); }} /></FormControlMeditation>
                                                            <FormLabelMeditation className="font-normal">{item.label}</FormLabelMeditation>
                                                        </FormItemMeditation>
                                                    )} />
                                                ))}
                                            </div><FormMessageMeditation />
                                        </FormItemMeditation>
                                    )} />
                                    <ButtonMeditation type="submit" disabled={!profile}>Generate Practice <MoveRightMeditation className="ml-2" /></ButtonMeditation>
                                </form>
                            </FormMeditation>
                        </CardContent>
                    </Card>
                </motionMeditation.div>
            )}
            {currentStep === MeditationSteps.GENERATING && (
                <motionMeditation.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card className="flex flex-col items-center justify-center py-24"><Loader2Meditation className="h-16 w-16 animate-spin text-primary" /><CardTitle className="mt-6">Preparing your meditation...</CardTitle><CardDescription className="mt-2">Our AI coach is finding your inner peace.</CardDescription></Card>
                </motionMeditation.div>
            )}
            {currentStep === MeditationSteps.RESULT && meditationResult && (
                <motionMeditation.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card>
                        <CardHeader><CardTitle className="text-3xl font-bold text-center">{meditationResult.title}</CardTitle><CardDescription className="text-center text-md pt-2">{meditationResult.summary}</CardDescription></CardHeader>
                        <CardContent className="space-y-8">
                            <div className="flex gap-2 justify-center flex-wrap">{meditationResult.tags.map(tag => <BadgeMeditation key={tag} variant="secondary">{tag}</BadgeMeditation>)}</div>
                            <AlertMeditation><SparklesMeditation className="h-4 w-4"/><AlertTitleMeditation>Benefits for You</AlertTitleMeditation><AlertDescriptionMeditation>{meditationResult.benefits}</AlertDescriptionMeditation></AlertMeditation>
                            <div>
                                <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><BrainCircuit className="text-primary"/> Guided Practice</h3>
                                <div className="space-y-4">
                                    {meditationResult.steps.map((step, i) => (
                                        <Card key={i} className="p-4 bg-muted/50">
                                            <CardTitle className="text-lg flex justify-between items-center">
                                                <span>Step {step.step}: {step.title}</span>
                                                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><TimerMeditation size={16}/>{step.duration}</span>
                                            </CardTitle>
                                            <CardDescription className="pt-3">{step.instruction}</CardDescription>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooterMeditation className="flex-col sm:flex-row gap-2 justify-center">
                            <ButtonMeditation onClick={resetFlow} variant="outline"><MoveLeftMeditation className="mr-2"/> New Practice</ButtonMeditation>
                            <ButtonMeditation onClick={handleDownloadPdf}><FileDownMeditation className="mr-2"/> Download PDF</ButtonMeditation>
                            <ButtonMeditation onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2Meditation className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                                Save to History
                            </ButtonMeditation>
                        </CardFooterMeditation>
                    </Card>
                </motionMeditation.div>
            )}
        </AnimatePresenceMeditation>
    );
}

const HistorySection = ({ history, loading, onView }: { history: RecommendationHistoryItem[], loading: boolean, onView: (item: RecommendationHistoryItem) => void }) => {
    
    const getSummary = (item: RecommendationHistoryItem) => {
        switch(item.type) {
            case 'workout': return item.data.planSummary;
            case 'meditation': return item.data.summary;
            case 'recipe': return item.data.description;
            default: return "No summary available.";
        }
    }

    const getIcon = (type: string) => {
        switch(type) {
            case 'workout': return <Dumbbell className="h-8 w-8 text-primary" />;
            case 'meditation': return <BrainCircuit className="h-8 w-8 text-primary" />;
            case 'recipe': return <ChefHat className="h-8 w-8 text-primary" />;
            default: return null;
        }
    }

    const getTitle = (item: RecommendationHistoryItem) => {
         switch(item.type) {
            case 'workout': return item.data.planTitle;
            case 'meditation': return item.data.title;
            case 'recipe': return item.data.name;
            default: return "History Item";
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History/> Recommendation History</CardTitle>
                <CardDescription>Your saved recommendations. Click a card to view the full details.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex justify-center"><Loader2History className="h-6 w-6 animate-spin"/></div> :
                    history.length === 0 ? <p className="text-muted-foreground text-center">No history saved yet.</p> :
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                       {history.map(item => (
                           <Card key={item.id} className="flex flex-col">
                               <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                   {getIcon(item.type)}
                                   <div className="flex-1">
                                       <p className="text-xs text-muted-foreground">{item.timestamp.toLocaleDateString()}</p>
                                       <CardTitle className="text-lg">{getTitle(item)}</CardTitle>
                                   </div>
                               </CardHeader>
                               <CardContent className="flex-1 space-y-4">
                                   <p className="text-sm text-muted-foreground line-clamp-3">{getSummary(item)}</p>
                                   <div className="flex flex-wrap gap-1">
                                       {(item.data.tags || []).map((tag:string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                   </div>
                               </CardContent>
                               <div className="p-6 pt-0">
                                   <Button className="w-full" variant="outline" onClick={() => onView(item)}>
                                       <Eye className="mr-2"/> View
                                   </Button>
                               </div>
                           </Card>
                       ))}
                    </div>
                }
            </CardContent>
        </Card>
    );
};


// --- Main Component ---
export default function RecommendationsPage() {
    const [user, authLoading] = useAuthState(auth);
    const { toast } = useToast();
    const [history, setHistory] = useState<RecommendationHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const [activeTab, setActiveTab] = useState<RecommendationType>('workout');
    const [viewData, setViewData] = useState<any>(null);
    const [creatorOpen, setCreatorOpen] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (user) {
            setLoadingHistory(true);
            try {
                const q = query(
                    collection(db, 'recommendation-history'),
                    where('userId', '==', user.uid),
                    orderBy('timestamp', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const historyItems = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: (doc.data().timestamp as Timestamp).toDate()
                })) as RecommendationHistoryItem[];
                setHistory(historyItems);
            } catch (e: any) {
                console.error("Failed to fetch history:", e);
                // Fail silently and show an empty history
                setHistory([]);
            } finally {
                setLoadingHistory(false);
            }
        } else {
            setLoadingHistory(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            fetchHistory();
        }
    }, [user, authLoading, fetchHistory]);

    const handleViewHistoryItem = (item: RecommendationHistoryItem) => {
        setViewData(null); 
        setActiveTab(item.type);
        setCreatorOpen(false);
        setTimeout(() => {
            setViewData(item.data);
        }, 50); 
    };

    const handleTabChange = (val: string) => {
        const newTab = val as RecommendationType;
        setActiveTab(newTab);
        setViewData(null);
        setCreatorOpen(false);
    }
    
  const CurrentCreator = useMemo(() => {
    if (viewData) return null; // Don't show creator if viewing history item

    return (
         <Collapsible open={creatorOpen} onOpenChange={setCreatorOpen}>
            <CollapsibleTrigger asChild>
                <div className="flex justify-center py-4">
                     <Button variant="outline">
                        <PlusCircle className="mr-2"/> Create New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                 {activeTab === 'workout' && <WorkoutGeneratorTab onSave={fetchHistory} initialData={null} isVisible={creatorOpen} />}
                 {activeTab === 'meditation' && <MeditationGeneratorTab onSave={fetchHistory} initialData={null} isVisible={creatorOpen} />}
                 {activeTab === 'recipe' && <RecipeGeneratorTab onSave={fetchHistory} initialData={null} isVisible={creatorOpen} />}
            </CollapsibleContent>
        </Collapsible>
    )
  }, [activeTab, creatorOpen, viewData, fetchHistory]);
  
  const ViewedItem = useMemo(() => {
      if(!viewData) return null;
      if(activeTab === 'workout') return <WorkoutGeneratorTab onSave={fetchHistory} initialData={viewData} isVisible={true} />;
      if(activeTab === 'meditation') return <MeditationGeneratorTab onSave={fetchHistory} initialData={viewData} isVisible={true} />;
      if(activeTab === 'recipe') return <RecipeGeneratorTab onSave={fetchHistory} initialData={viewData} isVisible={true} />;
      return null;
  }, [viewData, activeTab, fetchHistory])


  return (
    <div className="space-y-6">
        <HistorySection history={history} loading={loadingHistory} onView={handleViewHistoryItem} />
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workout">Workout</TabsTrigger>
            <TabsTrigger value="meditation">Meditation</TabsTrigger>
            <TabsTrigger value="recipe">Recipe</TabsTrigger>
        </TabsList>
        <TabsContent value="workout" forceMount className="mt-4">
             <div className="max-w-4xl mx-auto space-y-6" key={viewData ? 'workout-view' : 'workout-new'}>
                {viewData && activeTab === 'workout' ? ViewedItem : CurrentCreator}
            </div>
        </TabsContent>
        <TabsContent value="meditation" forceMount className="mt-4">
            <div className="max-w-4xl mx-auto space-y-6" key={viewData ? 'meditation-view' : 'meditation-new'}>
                {viewData && activeTab === 'meditation' ? ViewedItem : CurrentCreator}
            </div>
        </TabsContent>
        <TabsContent value="recipe" forceMount className="mt-4">
            <div className="max-w-4xl mx-auto space-y-6" key={viewData ? 'recipe-view' : 'recipe-new'}>
                {viewData && activeTab === 'recipe' ? ViewedItem : CurrentCreator}
            </div>
        </TabsContent>
        </Tabs>
    </div>
  );
}
