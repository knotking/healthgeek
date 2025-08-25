'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
import Link from 'next/link';
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

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
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
});

export type ProfileFormData = z.infer<typeof formSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      age: 0,
      bmi: 0,
      currentWeight: 0,
      targetWeight: 0,
      weightUnit: 'LB',
      healthIssues: [],
      diets: [],
    },
  });

  async function onSubmit(values: ProfileFormData) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

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
        email: values.email,
        dailyCalorieTarget,
      };

      await setDoc(doc(db, 'profiles', user.uid), profileData);
      
      toast({
        title: "Account Created!",
        description: `Your daily calorie target has been set to ${dailyCalorieTarget} kcal.`
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>Join HealthGeek.ai and start your personalized health journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="your.email@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
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
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
