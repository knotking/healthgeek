
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import { Separator } from '@/components/ui/separator';

const healthIssues = {
  "Cardiovascular": [
    { id: 'hypertension', label: 'Hypertension (High Blood Pressure)' },
    { id: 'cad', label: 'Coronary Artery Disease (CAD)' },
    { id: 'heart-failure', label: 'Heart Failure' },
    { id: 'stroke', label: 'Stroke' },
    { id: 'arrhythmia', label: 'Arrhythmia (Irregular Heartbeat)' },
  ],
  "Endocrine & Metabolic": [
    { id: 'diabetes', label: 'Diabetes' },
    { id: 'thyroid', label: 'Thyroid Disorder' },
    { id: 'obesity', label: 'Obesity' },
  ],
  "Respiratory": [
    { id: 'asthma', label: 'Asthma' },
    { id: 'copd', label: 'COPD' },
    { id: 'cystic-fibrosis', label: 'Cystic Fibrosis' },
  ],
  "Neurological": [
    { id: 'alzheimers', label: 'Alzheimer\'s Disease' },
    { id: 'parkinsons', label: 'Parkinson\'s Disease' },
    { id: 'epilepsy', label: 'Epilepsy' },
    { id: 'ms', label: 'Multiple Sclerosis (MS)' },
  ],
  "Musculoskeletal": [
    { id: 'arthritis', label: 'Arthritis' },
    { id: 'osteoporosis', label: 'Osteoporosis' },
    { id: 'fibromyalgia', label: 'Fibromyalgia' },
  ],
  "Mental Health": [
    { id: 'depression', label: 'Depression' },
    { id: 'anxiety', label: 'Anxiety Disorder' },
    { id: 'bipolar', label: 'Bipolar Disorder' },
    { id: 'schizophrenia', label: 'Schizophrenia' },
  ],
  "Infectious Diseases": [
    { id: 'hiv-aids', label: 'HIV/AIDS' },
    { id: 'hepatitis', label: 'Hepatitis' },
  ],
  "Cancers": [
    { id: 'cancer-breast', label: 'Breast Cancer' },
    { id: 'cancer-lung', label: 'Lung Cancer' },
    { id: 'cancer-prostate', label: 'Prostate Cancer' },
    { id: 'cancer-colorectal', label: 'Colorectal Cancer' },
    { id: 'leukemia', label: 'Leukemia' },
  ],
  "Digestive": [
    { id: 'gerd', label: 'GERD' },
    { id: 'ibd', label: 'Crohn\'s or Ulcerative Colitis (IBD)' },
    { id: 'celiac', label: 'Celiac Disease' },
  ],
   "Genetic": [
      { id: 'sickle-cell', label: 'Sickle Cell Anemia' },
      { id: 'down-syndrome', label: 'Down Syndrome' },
  ]
};

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
  height: z.coerce.number().min(1, 'Height is required.'),
  heightUnit: z.enum(['CM', 'IN']),
  currentWeight: z.coerce.number().min(1, 'Current weight is required.'),
  targetWeight: z.coerce.number().min(1, 'Target weight is required.'),
  weightUnit: z.enum(['KG', 'LB']),
  healthIssues: z.array(z.string()).optional(),
  diets: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one diet preference.',
  }),
  bmi: z.coerce.number().optional(),
});

type ProfileFormData = z.infer<typeof formSchema>;

function calculateBMI(data: {
  height: number;
  heightUnit: 'CM' | 'IN';
  currentWeight: number;
  weightUnit: 'KG' | 'LB';
}): number {
  if (data.height <= 0 || data.currentWeight <= 0) return 0;

  if (data.heightUnit === 'CM' && data.weightUnit === 'KG') {
    const heightInMeters = data.height / 100;
    return data.currentWeight / (heightInMeters * heightInMeters);
  }

  if (data.heightUnit === 'IN' && data.weightUnit === 'LB') {
    return (data.currentWeight / (data.height * data.height)) * 703;
  }
  
  const weightInKg = data.weightUnit === 'LB' ? data.currentWeight * 0.453592 : data.currentWeight;
  const heightInM = data.heightUnit === 'IN' ? data.height * 0.0254 : data.height / 100;
  
  if (heightInM === 0) return 0;

  return weightInKg / (heightInM * heightInM);
}


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
      height: 0,
      heightUnit: 'CM',
      currentWeight: 0,
      targetWeight: 0,
      weightUnit: 'KG',
      healthIssues: [],
      diets: [],
      bmi: 0,
    },
  });

  const watchedValues = form.watch(['height', 'heightUnit', 'currentWeight', 'weightUnit']);

  useEffect(() => {
    const [height, heightUnit, currentWeight, weightUnit] = watchedValues;
    const bmi = calculateBMI({ height, heightUnit, currentWeight, weightUnit });
    form.setValue('bmi', parseFloat(bmi.toFixed(2)));
  }, [watchedValues, form]);


  async function onSubmit(values: ProfileFormData) {
    setLoading(true);
    try {
      const bmi = calculateBMI(values);
      if (bmi === 0) {
          toast({ title: 'Invalid Input', description: 'Height and weight must be greater than zero.', variant: 'destructive' });
          setLoading(false);
          return;
      }
      form.setValue('bmi', parseFloat(bmi.toFixed(2)));
      values.bmi = parseFloat(bmi.toFixed(2));
      
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const { dailyCalorieTarget } = await generateCalorieTarget({
        age: values.age,
        bmi: values.bmi,
        currentWeight: values.currentWeight,
        targetWeight: values.targetWeight,
        weightUnit: values.weightUnit,
        healthIssues: values.healthIssues || [],
        diets: values.diets,
      });

      const profileData = {
        name: values.name,
        age: values.age,
        bmi: values.bmi,
        height: {
          value: values.height,
          unit: values.heightUnit,
        },
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

      router.push('/dashboard/insights');
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
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>Join HealthGeek and start your personalized health journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Account Details</h3>
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
                </div>
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
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
                </div>
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Health Metrics</h3>
                    
                     <div className="grid grid-cols-2 gap-2">
                       <FormField control={form.control} name="height" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height</FormLabel>
                          <FormControl><Input type="number" placeholder="175" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="heightUnit" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4 pt-2">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="CM" /></FormControl>
                              <FormLabel className="font-normal">CM</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="IN" /></FormControl>
                              <FormLabel className="font-normal">IN</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="currentWeight" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Current Weight</FormLabel>
                        <FormControl><Input type="number" placeholder="70" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="targetWeight" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Target Weight</FormLabel>
                        <FormControl><Input type="number" placeholder="65" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    </div>
                    <FormField control={form.control} name="weightUnit" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Weight Unit</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4 pt-2">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="KG" /></FormControl>
                            <FormLabel className="font-normal">KG</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="LB" /></FormControl>
                            <FormLabel className="font-normal">LB</FormLabel>
                            </FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )} />
                    <FormField control={form.control} name="bmi" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Calculated BMI</FormLabel>
                        <FormControl><Input type="number" {...field} disabled /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Diet Preferences</h3>
                     <FormField
                    control={form.control}
                    name="diets"
                    render={() => (
                        <FormItem>
                        <p className="text-sm text-muted-foreground">Select all that apply.</p>
                        <div className="space-y-2 pt-2">
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
              </div>
              
              <Separator className="my-8"/>

              <FormField
                  control={form.control}
                  name="healthIssues"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-2xl font-semibold tracking-tight">Health Issues & Conditions</FormLabel>
                        <p className="text-md text-muted-foreground">Select any conditions that apply. This is crucial for personalizing your health plan.</p>
                      </div>
                       <div className="space-y-6">
                            {Object.entries(healthIssues).map(([category, issues]) => (
                                <div key={category}>
                                    <h3 className="font-semibold mb-3">{category}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {issues.map((item) => (
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
                                </div>
                            ))}
                       </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <Button type="submit" className="w-full mt-8" disabled={loading}>
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

    