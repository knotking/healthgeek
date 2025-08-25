
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChefHat, CookingPot, FileDown, Utensils, Clock, User, Sparkles, MoveRight, MoveLeft } from 'lucide-react';
import { generateSingleRecipe, SingleRecipeOutput } from '@/ai/flows/conversational-recipe-generator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatePresence, motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const recipeSchema = z.object({
  mealType: z.string().min(1, "Please select a meal type."),
  cuisine: z.string().min(2, "Please enter a cuisine style."),
  ingredientsToInclude: z.string().optional(),
  ingredientsToExclude: z.string().optional(),
  dietaryNotes: z.string().optional(),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

const Steps = {
  PREFERENCES: 1,
  GENERATING: 2,
  RESULT: 3,
};

export default function RecipeGeneratorPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [recipeResult, setRecipeResult] = useState<SingleRecipeOutput | null>(null);
  const [currentStep, setCurrentStep] = useState(Steps.PREFERENCES);

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      mealType: '',
      cuisine: '',
      ingredientsToInclude: '',
      ingredientsToExclude: '',
      dietaryNotes: '',
    },
  });

  const fetchUserData = useCallback(async () => {
    if (user) {
      setLoading(true);
      const docRef = doc(db, 'profiles', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        toast({
          variant: 'destructive',
          title: 'Profile Required',
          description: 'Please complete your user profile first.',
        });
      }
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    }
  }, [user, authLoading, fetchUserData]);

  async function onSubmit(values: RecipeFormData) {
    if (!profile) {
      toast({ title: 'Error', description: 'User profile is not loaded.', variant: 'destructive' });
      return;
    }
    setCurrentStep(Steps.GENERATING);
    try {
      const result = await generateSingleRecipe({
        ...values,
        userProfile: JSON.stringify(profile),
      });
      setRecipeResult(result);
      setCurrentStep(Steps.RESULT);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      setCurrentStep(Steps.PREFERENCES);
    }
  }

  function handleDownloadPdf() {
    if (!recipeResult) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text(recipeResult.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(recipeResult.description, 105, 30, { align: 'center', maxWidth: 180 });

    (doc as any).autoTable({
        head: [['Details', '']],
        body: [
            ['Prep Time', recipeResult.prepTime],
            ['Cook Time', recipeResult.cookTime],
            ['Servings', recipeResult.servings],
            ['Health Focus', recipeResult.healthFocus],
        ],
        startY: 40,
        theme: 'grid',
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    (doc as any).autoTable({
        head: [['Ingredients']],
        body: recipeResult.ingredients.map(i => [i]),
        startY: finalY + 10,
        theme: 'striped',
    });

    const finalY2 = (doc as any).lastAutoTable.finalY;

    (doc as any).autoTable({
        head: [['Instructions']],
        body: recipeResult.instructions.map((step, i) => [`${i + 1}. ${step}`]),
        startY: finalY2 + 10,
        theme: 'striped',
    });


    doc.save(`${recipeResult.name.replace(/\s+/g, '_')}.pdf`);
  }

  const resetFlow = () => {
    form.reset();
    setRecipeResult(null);
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


  if (authLoading || (loading && !profile)) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {currentStep === Steps.PREFERENCES && (
          <motion.div key="preferences" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ChefHat /> Create Your Perfect Recipe</CardTitle>
                <CardDescription>Tell us what you're in the mood for, and we'll generate a personalized recipe just for you.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="mealType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meal Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a meal type..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Breakfast">Breakfast</SelectItem>
                                <SelectItem value="Lunch">Lunch</SelectItem>
                                <SelectItem value="Dinner">Dinner</SelectItem>
                                <SelectItem value="Snack">Snack</SelectItem>
                                <SelectItem value="Dessert">Dessert</SelectItem>
                                <SelectItem value="Beverage">Beverage</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cuisine"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cuisine Style</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Italian, Mexican, Thai" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="ingredientsToInclude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ingredients to Include (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., chicken, broccoli, quinoa" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ingredientsToExclude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ingredients to Exclude (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., mushrooms, nuts" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="dietaryNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Dietary Notes (optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="e.g., low-fodmap, extra spicy, for kids..." {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={!profile}>
                      Generate Recipe <MoveRight className="ml-2" />
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
              <CardTitle className="mt-6">Crafting your recipe...</CardTitle>
              <CardDescription className="mt-2">Our AI chef is at work!</CardDescription>
            </Card>
          </motion.div>
        )}
        
        {currentStep === Steps.RESULT && recipeResult && (
           <motion.div key="result" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">{recipeResult.name}</CardTitle>
                    <CardDescription className="text-center text-md pt-2">{recipeResult.description}</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-muted p-3 rounded-lg">
                            <h4 className="font-semibold text-sm">Prep Time</h4>
                            <p className="text-lg flex items-center justify-center gap-1"><Clock className="h-4 w-4"/> {recipeResult.prepTime}</p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                            <h4 className="font-semibold text-sm">Cook Time</h4>
                            <p className="text-lg flex items-center justify-center gap-1"><Clock className="h-4 w-4"/> {recipeResult.cookTime}</p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                            <h4 className="font-semibold text-sm">Servings</h4>
                            <p className="text-lg flex items-center justify-center gap-1"><User className="h-4 w-4"/>{recipeResult.servings}</p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                            <h4 className="font-semibold text-sm">Health Focus</h4>
                            <p className="text-md flex items-center justify-center gap-1"><Sparkles className="h-4 w-4 text-primary"/>{recipeResult.healthFocus}</p>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-5 gap-8">
                        <div className="md:col-span-2">
                             <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Utensils /> Ingredients</h3>
                            <ul className="space-y-2 text-muted-foreground">
                                {recipeResult.ingredients.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1.5">&#8226;</span><span>{item}</span></li>)}
                            </ul>
                        </div>
                        <div className="md:col-span-3">
                            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><CookingPot /> Instructions</h3>
                            <ol className="space-y-4 text-muted-foreground">
                                {recipeResult.instructions.map((step, i) => <li key={i} className="flex items-start"><span className="font-bold text-primary mr-3">{i + 1}.</span><span>{step}</span></li>)}
                            </ol>
                        </div>
                    </div>
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
