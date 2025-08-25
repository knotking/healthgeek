'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateCalorieTarget } from '@/ai/flows/calorie-target-generator';

const healthIssues = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'hypertension', label: 'Hypertension' },
  { id: 'cholesterol', label: 'High Cholesterol' },
  { id: 'obesity', label: 'Obesity' },
  { id: 'thyroid', label: 'Thyroid Issues' },
] as const;

const diets = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'low-carb', label: 'Low-Carb' },
] as const;

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  age: z.coerce.number().min(1, 'Age is required.'),
  bmi: z.coerce.number().min(1, 'BMI is required.'),
  currentWeight: z.coerce.number().min(1, 'Current weight is required.'),
  targetWeight: z.coerce.number().min(1, 'Target weight is required.'),
  weightUnit: z.enum(['LB', 'KG']),
  healthIssues: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one health issue.',
  }),
  diets: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one diet preference.',
  }),
  dailyCalorieTarget: z.coerce.number().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      age: 0,
      bmi: 0,
      currentWeight: 0,
      targetWeight: 0,
      weightUnit: 'LB',
      healthIssues: [],
      diets: [],
      dailyCalorieTarget: 0,
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setFetchingProfile(true);
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          form.reset({
            name: profileData.name,
            age: profileData.age,
            bmi: profileData.bmi,
            currentWeight: profileData.weight.current,
            targetWeight: profileData.weight.target,
            weightUnit: profileData.weight.unit,
            healthIssues: profileData.healthIssues,
            diets: profileData.diets,
            dailyCalorieTarget: profileData.dailyCalorieTarget,
          });
        }
        setFetchingProfile(false);
      }
    }
    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading, form]);

  async function onSubmit(values: ProfileFormData) {
    if (!user) return;
    setLoading(true);
    try {
      const { dailyCalorieTarget } = await generateCalorieTarget({
        age: values.age,
        bmi: values.bmi,
        currentWeight: values.currentWeight,
        targetWeight: values.targetWeight,
        weightUnit: values.weightUnit,
        healthIssues: values.healthIssues,
        diets: values.diets,
      });

      const profileData = {
        name: values.name,
        age: values.age,
        bmi: values.bmi,
        weight: {
          current: values.currentWeight,
          target: values.targetWeight,
          unit: values.weightUnit,
        },
        healthIssues: values.healthIssues,
        diets: values.diets,
        email: user.email,
        dailyCalorieTarget: dailyCalorieTarget,
      };
      await setDoc(doc(db, 'profiles', user.uid), profileData);
      form.setValue('dailyCalorieTarget', dailyCalorieTarget);
      toast({
        title: 'Profile Updated',
        description: `Your profile has been successfully updated. Your new daily calorie target is ${dailyCalorieTarget} kcal.`,
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || fetchingProfile) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>View and edit your personal information. Your daily calorie target is calculated automatically based on your profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl><Input type="number" placeholder="25" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bmi" render={({ field }) => (
                  <FormItem>
                    <FormLabel>BMI</FormLabel>
                    <FormControl><Input type="number" placeholder="22.5" {...field} step="0.1" /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-2">
                 <FormField control={form.control} name="currentWeight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Weight</FormLabel>
                    <FormControl><Input type="number" placeholder="150" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="targetWeight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Weight</FormLabel>
                    <FormControl><Input type="number" placeholder="140" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
               <FormField control={form.control} name="weightUnit" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Weight Unit</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="LB" /></FormControl>
                        <FormLabel className="font-normal">LB</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="KG" /></FormControl>
                        <FormLabel className="font-normal">KG</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField
                control={form.control}
                name="healthIssues"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Health Issues</FormLabel>
                       <p className="text-sm text-muted-foreground">Select all that apply.</p>
                    </div>
                     <div className="space-y-2">
                    {healthIssues.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="healthIssues"
                        render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
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

              <FormField
                control={form.control}
                name="diets"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Diet Preferences</FormLabel>
                       <p className="text-sm text-muted-foreground">Select all that apply.</p>
                    </div>
                     <div className="space-y-2">
                    {diets.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="diets"
                        render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
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

              <FormField control={form.control} name="dailyCalorieTarget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Calorie Target (kcal)</FormLabel>
                    <FormControl><Input type="number" {...field} disabled /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
