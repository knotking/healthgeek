
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { analyzeFood, FoodAnalysisOutput } from '@/ai/flows/food-analyzer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Upload, Utensils, Zap, HeartPulse, List, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FoodLog extends FoodAnalysisOutput {
  id: string;
  timestamp: Date;
  foodName: string;
}

export default function TrackCaloriePage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState<'idle' | 'analyzing' | 'committing' | 'fetching'>('idle');
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dailyLog, setDailyLog] = useState<FoodLog[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserProfile = useCallback(async () => {
    if (user) {
      const docRef = doc(db, 'profiles', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        toast({
          title: 'Profile Not Found',
          description: 'Please complete your profile to set a calorie target.',
          variant: 'destructive',
        });
      }
    }
  }, [user, toast]);

  const fetchDailyLog = useCallback(async () => {
    if (user) {
      setLoading('fetching');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'food-log'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        where('timestamp', '<', Timestamp.fromDate(tomorrow)),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toDate(),
      })) as FoodLog[];
      setDailyLog(logs);
      setLoading('idle');
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserProfile();
      fetchDailyLog();
    }
  }, [user, authLoading, fetchUserProfile, fetchDailyLog]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setSelectedImage(dataUri);
        handleAnalysis(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async (imageDataUri: string) => {
    if (!profile) {
       toast({
        title: 'Profile Not Found',
        description: 'Please complete your profile before analyzing food.',
        variant: 'destructive',
      });
      return;
    }

    setLoading('analyzing');
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeFood({
        photoDataUri: imageDataUri,
        userProfile: JSON.stringify(profile),
      });
      setAnalysisResult(result);
    } catch (e: any) {
      setError('Failed to analyze food. Please try again.');
      console.error(e);
      toast({ title: 'Analysis Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setLoading('idle');
    }
  };
  
  const handleCommit = async () => {
    if (!user || !analysisResult) return;
    setLoading('committing');
    try {
      await addDoc(collection(db, 'food-log'), {
        userId: user.uid,
        timestamp: new Date(),
        foodName: analysisResult.foodName,
        calories: analysisResult.calories,
        healthImpact: analysisResult.healthImpact
      });
      toast({
        title: 'Food Logged',
        description: `${analysisResult.foodName} has been added to your daily log.`,
      });
      setAnalysisResult(null);
      setSelectedImage(null);
      fetchDailyLog();
    } catch (error: any) {
       toast({
        title: 'Commit Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
        setLoading('idle');
    }
  };

  const totalCalories = dailyLog.reduce((sum, log) => sum + log.calories, 0);
  const calorieTarget = profile?.dailyCalorieTarget || 0;
  const remainingCalories = calorieTarget - totalCalories;
  const progressPercentage = calorieTarget > 0 ? (totalCalories / calorieTarget) * 100 : 0;
  
  const projectedCaloriesExceeded = analysisResult && (remainingCalories - analysisResult.calories < 0);

  return (
    <Tabs defaultValue="track" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="track">Track Meal</TabsTrigger>
        <TabsTrigger value="log">Today's Log</TabsTrigger>
      </TabsList>
      <TabsContent value="track">
        <Card>
          <CardHeader>
            <CardTitle>Track Your Meal</CardTitle>
            <CardDescription>Upload a photo of your food to get an AI-powered analysis of its nutritional content and health impact.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedImage ? (
                <div className="space-y-4">
                    <Image
                        src={selectedImage}
                        alt="Selected food"
                        width={500}
                        height={400}
                        className="rounded-lg object-cover w-full aspect-video"
                    />
                    {loading === 'analyzing' && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <p>Analyzing your food, please wait...</p>
                        </div>
                    )}
                     {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

                    {analysisResult && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Utensils /> {analysisResult.foodName}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {projectedCaloriesExceeded && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Warning</AlertTitle>
                                        <AlertDescription>
                                            Eating this will exceed your daily calorie target by approximately {Math.abs(remainingCalories - analysisResult.calories)} kcal.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex items-center gap-2"><Zap /> <strong>Calories:</strong> {analysisResult.calories} kcal</div>
                                <div className="flex items-start gap-2"><HeartPulse /> <strong>Health Impact:</strong> <p className="text-sm">{analysisResult.healthImpact}</p></div>
                                <div className="flex gap-2 mt-4">
                                    <Button onClick={handleCommit} disabled={loading === 'committing'} className="w-full">
                                        {loading === 'committing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Commit to Log
                                    </Button>
                                    <Button variant="outline" onClick={() => { setSelectedImage(null); setAnalysisResult(null); }} className="w-full">
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-lg">
                    <Camera className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground">Take or upload a picture of your food</p>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={loading !== 'idle' || authLoading || !profile}>
                        <Upload className="mr-2 h-4 w-4" /> Upload Photo
                    </Button>
                     {!profile && !authLoading && <p className="text-sm text-destructive">Please complete your profile first.</p>}
                </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="log">
        <Card>
           <CardHeader>
              <CardTitle className="flex items-center gap-2"><List/>Today's Food Log</CardTitle>
              {calorieTarget > 0 ? (
                <CardDescription>Your target for today is {calorieTarget} kcal.</CardDescription>
              ) : (
                <CardDescription>Set your profile to see a daily calorie target.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
                {loading === 'fetching' && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                
                {calorieTarget > 0 && (
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Consumed: {totalCalories} kcal</span>
                      <span className="text-muted-foreground">Remaining: {remainingCalories} kcal</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                )}
                
                {dailyLog.length > 0 ? (
                    <div className="space-y-4">
                        <ul className="space-y-3 max-h-96 overflow-y-auto">
                           {dailyLog.map(log => (
                            <li key={log.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                <div>
                                    <p className="font-semibold">{log.foodName}</p>
                                    <p className="text-sm text-muted-foreground">{log.timestamp.toLocaleTimeString()}</p>
                                </div>
                                <p className="font-medium">{log.calories} kcal</p>
                            </li>
                           ))}
                        </ul>
                    </div>
                ) : (
                    loading === 'idle' && <p className="text-muted-foreground text-center py-8">No food logged yet today.</p>
                )}
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
