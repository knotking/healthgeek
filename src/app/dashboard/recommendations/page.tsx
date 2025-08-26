
'use client';

// Common Imports
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, query, where, orderBy, limit, getDocs, deleteDoc, Timestamp, getDocFromCache, serverTimestamp, writeBatch, documentId, startAfter, endBefore, limitToLast } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 as Loader2Common } from 'lucide-react';
import { Button as ButtonCommon } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge as BadgeCommon, badgeVariants } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AnimatePresence, motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, ChefHat, Dumbbell, User, Users, History, Eye, Trash2, Heart, ThumbsUp, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';


// Recipe Generator Imports
import { useForm as useFormRecipe } from 'react-hook-form';
import { zodResolver as zodResolverRecipe } from '@hookform/resolvers/zod';
import { z as zRecipe } from 'zod';
import { generateSingleRecipe, SingleRecipeOutput } from '@/ai/flows/conversational-recipe-generator';
import { Form as FormRecipe, FormControl as FormControlRecipe, FormField as FormFieldRecipe, FormItem as FormItemRecipe, FormLabel as FormLabelRecipe, FormMessage as FormMessageRecipe } from '@/components/ui/form';
import { Input as InputRecipe } from '@/components/ui/input';
import { Textarea as TextareaRecipe } from '@/components/ui/textarea';
import { Select as SelectRecipe, SelectContent as SelectContentRecipe, SelectItem as SelectItemRecipe, SelectTrigger as SelectTriggerRecipe, SelectValue as SelectValueRecipe } from '@/components/ui/select';
import { CookingPot, FileDown as FileDownRecipe, Utensils, Clock, Sparkles as SparklesRecipe, MoveRight as MoveRightRecipe, MoveLeft as MoveLeftRecipe } from 'lucide-react';


// Workout Generator Imports
import { useForm as useFormWorkout } from 'react-hook-form';
import { zodResolver as zodResolverWorkout } from '@hookform/resolvers/zod';
import { z as zWorkout } from 'zod';
import { generateWorkoutPlan, type WorkoutPlanOutput } from '@/ai/flows/workout-recommender';
import { Form as FormWorkout, FormControl as FormControlWorkout, FormField as FormFieldWorkout, FormItem as FormItemWorkout, FormLabel as FormLabelWorkout, FormMessage as FormMessageWorkout } from '@/components/ui/form';
import { RadioGroup as RadioGroupWorkout, RadioGroupItem as RadioGroupItemWorkout } from '@/components/ui/radio-group';
import { Slider as SliderWorkout } from '@/components/ui/slider';
import { Checkbox as CheckboxWorkout } from '@/components/ui/checkbox';
import { Alert as AlertWorkout, AlertDescription as AlertDescriptionWorkout, AlertTitle as AlertTitleWorkout } from '@/components/ui/alert';
import { FileDown as FileDownWorkout, Activity, Shield, MoveRight as MoveRightWorkout, MoveLeft as MoveLeftWorkout, Repeat, Target, Timer as TimerWorkout, HeartPulse } from 'lucide-react';


// Meditation Generator Imports
import { useForm as useFormMeditation } from 'react-hook-form';
import { zodResolver as zodResolverMeditation } from '@hookform/resolvers/zod';
import { z as zMeditation } from 'zod';
import { generateMeditationPractice, type MeditationPracticeOutput } from '@/ai/flows/meditation-recommender';
import { Form as FormMeditation, FormControl as FormControlMeditation, FormField as FormFieldMeditation, FormItem as FormItemMeditation, FormLabel as FormLabelMeditation, FormMessage as FormMessageMeditation } from '@/components/ui/form';
import { RadioGroup as RadioGroupMeditation, RadioGroupItem as RadioGroupItemMeditation } from '@/components/ui/radio-group';
import { Slider as SliderMeditation } from '@/components/ui/slider';
import { Checkbox as CheckboxMeditation } from '@/components/ui/checkbox';
import { FileDown as FileDownMeditation, MoveRight as MoveRightMeditation, MoveLeft as MoveLeftMeditation, Sparkles as SparklesMeditation, Timer as TimerMeditation } from 'lucide-react';


const ITEMS_PER_PAGE = 5;

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

function RecipeGenerator() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [recipeResult, setRecipeResult] = useState<SingleRecipeOutput | null>(null);
  const [currentStep, setCurrentStep] = useState(RecipeSteps.PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const form = useFormRecipe<RecipeFormData>({
    resolver: zodResolverRecipe(recipeSchema),
    defaultValues: { mealType: '', cuisine: '', ingredientsToInclude: '', ingredientsToExclude: '', dietaryNotes: '' },
  });

  const fetchUserData = useCallback(async () => {
    if (user) {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
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

  useEffect(() => {
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
        await addDoc(collection(db, 'recommendation-history'), {
            userId: user.uid,
            userName: profile?.name || 'Anonymous',
            type: 'recipe',
            data: recipeResult,
            isPublic,
            timestamp: serverTimestamp(),
            rating: 0,
        });
        toast({ title: 'Success', description: 'Recipe saved to your history.' });
    } catch (e: any) {
        toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
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
    setIsPublic(false);
  }

  const pageVariants = { initial: { opacity: 0, x: 50 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -50 } };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

  if (authLoading || (loading && !profile)) return <div className="flex justify-center py-6"><Loader2Common className="h-8 w-8 animate-spin" /></div>;

  return (
    <AnimatePresence mode="wait">
      {currentStep === RecipeSteps.PREFERENCES && (
        <motion.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
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
                  <ButtonCommon type="submit" disabled={!profile}>Generate Recipe <MoveRightRecipe className="ml-2" /></ButtonCommon>
                </form>
              </FormRecipe>
            </CardContent>
          </Card>
        </motion.div>
      )}
      {currentStep === RecipeSteps.GENERATING && (
        <motion.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card className="flex flex-col items-center justify-center py-24"><Loader2Common className="h-16 w-16 animate-spin text-primary" /><CardTitle className="mt-6">Crafting your recipe...</CardTitle><CardDescription className="mt-2">Our AI chef is at work!</CardDescription></Card>
        </motion.div>
      )}
      {currentStep === RecipeSteps.RESULT && recipeResult && (
         <motion.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card>
              <CardHeader><CardTitle className="text-3xl font-bold text-center">{recipeResult.name}</CardTitle><CardDescription className="text-center text-md pt-2">{recipeResult.description}</CardDescription></CardHeader>
               <CardContent className="space-y-8">
                   <div className="flex gap-2 justify-center flex-wrap">{recipeResult.tags.map(tag => <BadgeCommon key={tag} variant="secondary">{tag}</BadgeCommon>)}</div>
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
               <CardFooter className="flex-col sm:flex-row gap-4 justify-center">
                    <ButtonCommon onClick={resetFlow} variant="outline"><MoveLeftRecipe className="mr-2"/> Generate Another</ButtonCommon>
                    <ButtonCommon onClick={() => handleDownloadPdf(recipeResult)}><FileDownRecipe className="mr-2"/> Download PDF</ButtonCommon>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="publish-recipe" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
                        <label htmlFor="publish-recipe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Share with community
                        </label>
                    </div>
                    <ButtonCommon onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2Common className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
                        Save to History
                    </ButtonCommon>
                </CardFooter>
          </Card>
         </motion.div>
      )}
    </AnimatePresence>
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

function WorkoutGenerator() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);
  const [workoutResult, setWorkoutResult] = useState<WorkoutPlanOutput | null>(null);
  const [currentStep, setCurrentStep] = useState(WorkoutSteps.PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const form = useFormWorkout<WorkoutFormData>({
    resolver: zodResolverWorkout(workoutSchema),
    defaultValues: { workoutDuration: 30, location: 'home', focusAreas: [] },
  });

  const fetchUserData = useCallback(async () => {
    if (user) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) setProfile(profileSnap.data());
        else toast({ variant: 'destructive', title: 'Profile Required', description: 'Please complete your user profile first.' });

        const reportsQuery = query(collection(db, 'health-reports'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(1));
        const reportSnapshot = await getDocs(reportsQuery);
        if (!reportSnapshot.empty) setLatestHealthReport(reportSnapshot.docs[0].data());
      } catch (e: any) {
        toast({ title: "Data Fetch Failed", description: "Could not load your user data.", variant: "destructive" });
      } finally {
        setInitialLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
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
            userName: profile?.name || 'Anonymous',
            type: 'workout',
            data: workoutResult,
            isPublic,
            timestamp: serverTimestamp(),
            rating: 0,
        });
        toast({ title: 'Success', description: 'Workout saved to your history.' });
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
    setIsPublic(false);
  }

  const pageVariants = { initial: { opacity: 0, x: 50 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -50 } };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

  if (authLoading || initialLoading) return <div className="flex justify-center py-6"><Loader2Common className="h-8 w-8 animate-spin" /></div>;

  return (
    <AnimatePresence mode="wait">
      {currentStep === WorkoutSteps.PREFERENCES && (
        <motion.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
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
                  <ButtonCommon type="submit" disabled={!profile}>Generate Workout Plan <MoveRightWorkout className="ml-2" /></ButtonCommon>
                </form>
              </FormWorkout>
            </CardContent>
          </Card>
        </motion.div>
      )}
      {currentStep === WorkoutSteps.GENERATING && (
        <motion.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card className="flex flex-col items-center justify-center py-24"><Loader2Common className="h-16 w-16 animate-spin text-primary" /><CardTitle className="mt-6">Building your workout plan...</CardTitle><CardDescription className="mt-2">Our AI coach is personalizing your session!</CardDescription></Card>
        </motion.div>
      )}
      {currentStep === WorkoutSteps.RESULT && workoutResult && (
         <motion.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <Card>
              <CardHeader><CardTitle className="text-3xl font-bold text-center">{workoutResult.planTitle}</CardTitle><CardDescription className="text-center text-md pt-2">{workoutResult.planSummary}</CardDescription></CardHeader>
               <CardContent className="space-y-8">
                   <div className="flex gap-2 justify-center flex-wrap">{workoutResult.tags.map(tag => <BadgeCommon key={tag} variant="secondary">{tag}</BadgeCommon>)}</div>
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
               <CardFooter className="flex-col sm:flex-row gap-4 justify-center">
                    <ButtonCommon onClick={resetFlow} variant="outline"><MoveLeftWorkout className="mr-2"/> New Workout</ButtonCommon>
                    <ButtonCommon onClick={handleDownloadPdf}><FileDownWorkout className="mr-2"/> Download PDF</ButtonCommon>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="publish-workout" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
                        <label htmlFor="publish-workout" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Share with community
                        </label>
                    </div>
                    <ButtonCommon onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2Common className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
                        Save to History
                    </ButtonCommon>
                </CardFooter>
          </Card>
         </motion.div>
      )}
    </AnimatePresence>
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

function MeditationGenerator() {
    const [user, authLoading] = useAuthState(auth);
    const { toast } = useToast();
    const [initialLoading, setInitialLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [meditationResult, setMeditationResult] = useState<MeditationPracticeOutput | null>(null);
    const [currentStep, setCurrentStep] = useState(MeditationSteps.PREFERENCES);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(false);

    const form = useFormMeditation<MeditationFormData>({
        resolver: zodResolverMeditation(meditationSchema),
        defaultValues: { duration: 10, timeOfDay: 'morning', goals: [] },
    });

    const fetchUserData = useCallback(async () => {
        if (user) {
            try {
                const profileRef = doc(db, 'profiles', user.uid);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) setProfile(profileSnap.data());
                else toast({ variant: 'destructive', title: 'Profile Required', description: 'Please complete your user profile first.' });
            } catch (e: any) {
                toast({ title: "Data Fetch Failed", description: "Could not load your user data.", variant: "destructive" });
            } finally {
                setInitialLoading(false);
            }
        }
    }, [user, toast]);

    useEffect(() => {
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
                userName: profile?.name || 'Anonymous',
                type: 'meditation',
                data: meditationResult,
                isPublic,
                timestamp: serverTimestamp(),
                rating: 0,
            });
            toast({ title: 'Success', description: 'Meditation saved to your history.' });
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
        setIsPublic(false);
    }

    const pageVariants = { initial: { opacity: 0, x: 50 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -50 } };
    const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

    if (authLoading || initialLoading) return <div className="flex justify-center py-6"><Loader2Common className="h-8 w-8 animate-spin" /></div>;

    return (
        <AnimatePresence mode="wait">
            {currentStep === MeditationSteps.PREFERENCES && (
                <motion.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
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
                                    <ButtonCommon type="submit" disabled={!profile}>Generate Practice <MoveRightMeditation className="ml-2" /></ButtonCommon>
                                </form>
                            </FormMeditation>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
            {currentStep === MeditationSteps.GENERATING && (
                <motion.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card className="flex flex-col items-center justify-center py-24"><Loader2Common className="h-16 w-16 animate-spin text-primary" /><CardTitle className="mt-6">Preparing your meditation...</CardTitle><CardDescription className="mt-2">Our AI coach is finding your inner peace.</CardDescription></Card>
                </motion.div>
            )}
            {currentStep === MeditationSteps.RESULT && meditationResult && (
                <motion.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card>
                        <CardHeader><CardTitle className="text-3xl font-bold text-center">{meditationResult.title}</CardTitle><CardDescription className="text-center text-md pt-2">{meditationResult.summary}</CardDescription></CardHeader>
                        <CardContent className="space-y-8">
                            <div className="flex gap-2 justify-center flex-wrap">{meditationResult.tags.map(tag => <BadgeCommon key={tag} variant="secondary">{tag}</BadgeCommon>)}</div>
                            <Alert variant="default"><SparklesMeditation className="h-4 w-4"/><AlertTitle>Benefits for You</AlertTitle><AlertDescription>{meditationResult.benefits}</AlertDescription></Alert>
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
                        <CardFooter className="flex-col sm:flex-row gap-4 justify-center">
                            <ButtonCommon onClick={resetFlow} variant="outline"><MoveLeftMeditation className="mr-2"/> New Practice</ButtonCommon>
                            <ButtonCommon onClick={handleDownloadPdf}><FileDownMeditation className="mr-2"/> Download PDF</ButtonCommon>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="publish-meditation" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
                                <label htmlFor="publish-meditation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Share with community
                                </label>
                            </div>
                            <ButtonCommon onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2Common className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
                                Save to History
                            </ButtonCommon>
                        </CardFooter>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

type Recommendation = {
  id: string;
  userId: string;
  userName: string;
  type: 'workout' | 'meditation' | 'recipe';
  data: any;
  isPublic: boolean;
  timestamp: Timestamp;
  rating: number;
}

const Generators = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
        <Accordion type="single" collapsible className="w-full" defaultValue="workout">
            <AccordionItem value="workout">
                <AccordionTrigger className="text-xl font-semibold">
                    <div className="flex items-center gap-3">
                        <Dumbbell className="h-6 w-6 text-primary"/>
                        Workout Generator
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                    <WorkoutGenerator />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="meditation">
                <AccordionTrigger className="text-xl font-semibold">
                     <div className="flex items-center gap-3">
                        <BrainCircuit className="h-6 w-6 text-primary"/>
                        Meditation Generator
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                    <MeditationGenerator />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="recipe">
                <AccordionTrigger className="text-xl font-semibold">
                     <div className="flex items-center gap-3">
                        <ChefHat className="h-6 w-6 text-primary"/>
                        Recipe Generator
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                    <RecipeGenerator />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
);

const ViewDetailsDialog = ({ recommendation }: { recommendation: Recommendation }) => {
    let content;
    switch(recommendation.type) {
        case 'workout':
            const workout: WorkoutPlanOutput = recommendation.data;
            content = (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
                    <Alert variant="destructive"><Shield className="h-4 w-4"/><AlertTitle>Safety First!</AlertTitle><AlertDescription>{workout.notes}</AlertDescription></Alert>
                    {[{title: 'Warm-Up', icon: Activity, exercises: workout.warmUp}, {title: 'Main Workout', icon: Dumbbell, exercises: workout.mainWorkout}, {title: 'Cool-Down', icon: HeartPulse, exercises: workout.coolDown}].map(section => (
                        section.exercises.length > 0 && <div key={section.title}>
                            <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><section.icon className="text-primary"/> {section.title}</h4>
                            <div className="space-y-3">
                                {section.exercises.map((ex, i) => (
                                    <Card key={i} className="p-3 bg-muted/50">
                                        <p className="font-semibold">{ex.name}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                                            <span><strong>Sets:</strong> {ex.sets}</span>
                                            <span><strong>Reps:</strong> {ex.reps}</span>
                                            <span><strong>Rest:</strong> {ex.rest}</span>
                                        </div>
                                        <p className="text-xs mt-2">{ex.description}</p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
            break;
        case 'meditation':
            const meditation: MeditationPracticeOutput = recommendation.data;
            content = (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
                     <Alert><SparklesMeditation className="h-4 w-4"/><AlertTitle>Benefits for You</AlertTitle><AlertDescription>{meditation.benefits}</AlertDescription></Alert>
                     <div>
                        <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><BrainCircuit className="text-primary"/> Guided Practice</h4>
                        <div className="space-y-3">
                            {meditation.steps.map((step, i) => (
                                <Card key={i} className="p-3 bg-muted/50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">Step {step.step}: {step.title}</p>
                                        <span className="text-xs font-medium text-muted-foreground">{step.duration}</span>
                                    </div>
                                    <p className="text-xs mt-2">{step.instruction}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            );
            break;
        case 'recipe':
             const recipe: SingleRecipeOutput = recommendation.data;
             content = (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-muted p-2 rounded-lg"><p className="font-semibold">Prep Time</p><p>{recipe.prepTime}</p></div>
                      <div className="bg-muted p-2 rounded-lg"><p className="font-semibold">Cook Time</p><p>{recipe.cookTime}</p></div>
                      <div className="bg-muted p-2 rounded-lg"><p className="font-semibold">Servings</p><p>{recipe.servings}</p></div>
                      <div className="bg-muted p-2 rounded-lg"><p className="font-semibold">Health Focus</p><p>{recipe.healthFocus}</p></div>
                  </div>
                   <div className="grid md:grid-cols-2 gap-6">
                        <div><h4 className="font-bold text-lg mb-2">Ingredients</h4><ul className="space-y-1 text-sm list-disc pl-5">{recipe.ingredients.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                        <div><h4 className="font-bold text-lg mb-2">Instructions</h4><ol className="space-y-2 text-sm list-decimal pl-5">{recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}</ol></div>
                    </div>
                </div>
             );
            break;
    }
    
    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{recommendation.type === 'workout' ? recommendation.data.planTitle : recommendation.data.name}</DialogTitle>
                <DialogDescription>{recommendation.type === 'workout' ? recommendation.data.planSummary : recommendation.data.description}</DialogDescription>
                <div className="flex gap-2 justify-center flex-wrap pt-2">{recommendation.data.tags.map((tag:string) => <BadgeCommon key={tag} variant="secondary" className="text-xs">{tag}</BadgeCommon>)}</div>
            </DialogHeader>
            {content}
            <DialogFooter>
                <DialogTrigger asChild><ButtonCommon variant="outline">Close</ButtonCommon></DialogTrigger>
            </DialogFooter>
        </DialogContent>
    )
}

const RecommendationCard = ({ recommendation, isOwner, onDelete }: { recommendation: Recommendation, isOwner: boolean, onDelete?: (id: string) => void }) => {
    const { toast } = useToast();
    const [user] = useAuthState(auth);

    const title = recommendation.type === 'workout' ? recommendation.data.planTitle : recommendation.data.name;
    const description = recommendation.type === 'workout' ? recommendation.data.planSummary : recommendation.data.description;

    const typeDetails = useMemo(() => {
        switch (recommendation.type) {
            case 'workout': return { icon: Dumbbell, color: 'text-red-400' };
            case 'meditation': return { icon: BrainCircuit, color: 'text-blue-400' };
            case 'recipe': return { icon: ChefHat, color: 'text-green-400' };
            default: return { icon: Star, color: 'text-yellow-400' };
        }
    }, [recommendation.type]);
    
    const handleDelete = async () => {
        if (!onDelete || !user || user.uid !== recommendation.userId) return;

        try {
            await deleteDoc(doc(db, 'recommendation-history', recommendation.id));
            toast({ title: 'Success', description: 'Recommendation deleted.' });
            onDelete(recommendation.id);
        } catch (e: any) {
            toast({ title: 'Error', description: 'Could not delete recommendation.', variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <typeDetails.icon className={`h-5 w-5 ${typeDetails.color}`} />
                        <span>{title}</span>
                    </div>
                    <Dialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <ButtonCommon variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </ButtonCommon>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                 <DialogTrigger asChild>
                                    <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                </DialogTrigger>
                                {isOwner && onDelete && (
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ViewDetailsDialog recommendation={recommendation} />
                    </Dialog>
                </CardTitle>
                <CardDescription className="line-clamp-2 pt-1">{description}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between text-xs text-muted-foreground">
                <div>
                  <p>By: {recommendation.userName}</p>
                  <p>On: {recommendation.timestamp.toDate().toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4"/> {recommendation.rating}
                </div>
            </CardFooter>
        </Card>
    );
}

const MyHistory = () => {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [history, setHistory] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [firstDoc, setFirstDoc] = useState<any>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [isEnd, setIsEnd] = useState(false);
    const [page, setPage] = useState(1);

    const fetchHistory = useCallback(async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        let currentIsLoading = direction === 'initial';
        if (currentIsLoading) setIsLoading(true);
        
        setIsFetchingMore(true);

        try {
            let q;
            const baseQuery = [
                collection(db, 'recommendation-history'),
                where('userId', '==', user.uid),
                orderBy('timestamp', 'desc')
            ];

            if (direction === 'next' && lastDoc) {
                q = query(...baseQuery, startAfter(lastDoc), limit(ITEMS_PER_PAGE));
            } else if (direction === 'prev' && firstDoc) {
                q = query(...baseQuery, endBefore(firstDoc), limitToLast(ITEMS_PER_PAGE));
            } else {
                q = query(...baseQuery, limit(ITEMS_PER_PAGE));
            }

            const docSnap = await getDocs(q);
            const newHistory = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as Recommendation));
            
            if (newHistory.length > 0) {
                setHistory(newHistory);
                setLastDoc(docSnap.docs[docSnap.docs.length - 1]);
                setFirstDoc(docSnap.docs[0]);
                 if(direction === 'next') setPage(p => p + 1);
                 if(direction === 'prev' && page > 1) setPage(p => p - 1);
            } else if(direction === 'next') {
                setIsEnd(true);
                toast({title: "That's all!", description: "You've reached the end of your history."});
            }

             if (docSnap.empty && direction === 'initial') {
                setHistory([]);
            }

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: "Could not fetch your history.", variant: "destructive" });
        } finally {
            if(currentIsLoading) setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [user, toast, lastDoc, firstDoc, page]);
    
    useEffect(() => {
        if(user) {
            fetchHistory('initial');
        }
    }, [user]);

    const handleDelete = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (history.length === 1 && page > 1) { // last item on a page that is not the first page
            setPage(p => p - 1);
        }
        fetchHistory('initial');
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2Common className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (history.length === 0) {
        return <div className="text-center py-16 text-muted-foreground">You have no saved recommendations yet.</div>
    }

    return (
        <div className="space-y-4">
            {history.map(item => <RecommendationCard key={item.id} recommendation={item} isOwner={item.userId === user?.uid} onDelete={handleDelete} />)}
            <div className="flex justify-between items-center pt-4">
                <ButtonCommon onClick={() => fetchHistory('prev')} disabled={page <= 1 || isFetchingMore}>Previous</ButtonCommon>
                <span>Page {page}</span>
                <ButtonCommon onClick={() => fetchHistory('next')} disabled={isEnd || isFetchingMore}>Next</ButtonCommon>
            </div>
        </div>
    );
}

// --- Main Component ---
export default function RecommendationsPage() {
  
  return (
    <Tabs defaultValue="generators" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generators"><SparklesRecipe className="mr-2 h-4 w-4"/>Generators</TabsTrigger>
          <TabsTrigger value="my-history"><History className="mr-2 h-4 w-4"/>My History</TabsTrigger>
        </TabsList>
        <TabsContent value="generators" className="pt-6">
            <Generators />
        </TabsContent>
        <TabsContent value="my-history" className="pt-6">
            <MyHistory />
        </TabsContent>
      </Tabs>
  );
}

    
