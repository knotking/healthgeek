
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, startAt, endAt, deleteDoc } from 'firebase/firestore';
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
import { Loader2, Camera, Upload, Utensils, Zap, HeartPulse, List, AlertTriangle, VideoOff, RefreshCw, PlusCircle, Search, Brain, Clock, BookText, Dumbbell, Flame, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// --- Calorie Tracking Components ---

interface FoodLog {
  id: string;
  timestamp: Date;
  foodName: string;
  calories: number;
  healthImpact: string;
}

function FoodAnalysisDialog({ open, onOpenChange, profile, latestHealthReport, onFoodLogged }: { open: boolean, onOpenChange: (open: boolean) => void, profile: any, latestHealthReport: any, onFoodLogged: () => void }) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState<'idle' | 'analyzing' | 'committing'>('idle');
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    let stream: MediaStream;
    const getCameraPermission = async () => {
      if (!isCameraOpen) {
        if (videoRef.current?.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        return;
      }
      
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported on this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        setIsCameraOpen(false);
      }
    };

    if (open) {
      getCameraPermission();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isCameraOpen, toast, facingMode, open]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

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
  
  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if(context){
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/png');
        setSelectedImage(dataUri);
        handleAnalysis(dataUri);
      }
      setIsCameraOpen(false);
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
        latestHealthReport: latestHealthReport ? JSON.stringify(latestHealthReport) : undefined,
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
      resetState();
      onFoodLogged();
      onOpenChange(false);
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

  const resetState = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const calorieTarget = profile?.dailyCalorieTarget || 0;
  const projectedCaloriesExceeded = analysisResult && calorieTarget > 0 && ((profile.todaysCalories || 0) + analysisResult.calories > calorieTarget);

  return (
    <>
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetState(); onOpenChange(isOpen); }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Track New Meal</DialogTitle>
            <DialogDescription>Use your camera or upload a photo to analyze a meal and add it to your log.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
            {selectedImage ? (
                <div className="space-y-4">
                <Image src={selectedImage} alt="Selected food" width={400} height={300} className="rounded-lg object-cover w-full aspect-video" />
                {loading === 'analyzing' && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p>Analyzing your food...</p>
                    </div>
                )}
                {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                {analysisResult && (
                    <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Utensils /> {analysisResult.foodName}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {projectedCaloriesExceeded && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning: Calorie Target</AlertTitle>
                            <AlertDescription>Eating this may exceed your daily goal.</AlertDescription>
                        </Alert>
                        )}
                        <div className="flex items-center gap-2"><Zap /> <strong>Calories:</strong> {analysisResult.calories} kcal</div>
                        <div className="flex items-start gap-2"><HeartPulse /> <strong>Health Impact:</strong> <p className="text-sm">{analysisResult.healthImpact}</p></div>
                    </CardContent>
                    </Card>
                )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-lg">
                <Utensils className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">Take or upload a picture</p>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                <div className="flex gap-2">
                    <Button onClick={() => setIsCameraOpen(true)} disabled={loading !== 'idle'}><Camera className="mr-2 h-4 w-4" /> Take Photo</Button>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={loading !== 'idle'}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                </div>
                </div>
            )}
            </div>
            <DialogFooter>
                {analysisResult && (
                    <div className="w-full flex gap-2">
                        <Button variant="outline" onClick={resetState} className="w-full">Cancel</Button>
                        <Button onClick={handleCommit} disabled={loading === 'committing'} className="w-full">
                            {loading === 'committing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Commit to Log
                        </Button>
                    </div>
                )}
            </DialogFooter>
        </DialogContent>
        </Dialog>
        
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Take a Photo</DialogTitle>
            <DialogDescription>Center your food item in the frame and click capture.</DialogDescription>
            </DialogHeader>
            <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white rounded-md">
                <VideoOff className="w-12 h-12 mb-4" />
                <p className="text-center">Camera access is denied.<br/>Please enable it in your browser settings.</p>
                </div>
            )}
            </div>
            <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={toggleCamera} disabled={hasCameraPermission !== true}><RefreshCw className="mr-2 h-4 w-4" /> Switch Camera</Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                <Button onClick={handleTakePhoto} disabled={hasCameraPermission !== true}><Camera className="mr-2 h-4 w-4" /> Capture</Button>
            </div>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    </>
  );
}

function CalorieTracker() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dailyLog, setDailyLog] = useState<FoodLog[]>([]);
  const [historyLog, setHistoryLog] = useState<FoodLog[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  const fetchUserData = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          toast({
            title: 'Profile Not Found',
            description: 'Please complete your profile to use this feature.',
            variant: 'destructive',
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
      } catch (e: any) {
        toast({ title: 'Error fetching user data', variant: 'destructive', description: e.message });
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);
  
  const fetchDailyLog = useCallback(async () => {
    if (user) {
      setLoading(true);
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
      setLoading(false);
    }
  }, [user]);
  
  const fetchInitialHistory = useCallback(async () => {
    if (user) {
        setLoading(true);
        const q = query(
            collection(db, 'food-log'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp).toDate(),
        })) as FoodLog[];
        setHistoryLog(logs);
        setLoading(false);
    }
  }, [user]);

  const searchHistory = useCallback(async (searchString: string) => {
    if(!user) return;
    setLoading(true);
    const q = query(
        collection(db, 'food-log'),
        where('userId', '==', user.uid),
        orderBy('foodName'),
        startAt(searchString),
        endAt(searchString + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toDate(),
    })) as FoodLog[];
    setHistoryLog(logs);
    setLoading(false);
  }, [user]);
  
  const handleDelete = async (logId: string) => {
    try {
        await deleteDoc(doc(db, "food-log", logId));
        toast({ title: "Log Deleted", description: "The food log entry has been removed." });
        if(activeTab === 'today') fetchDailyLog();
        else fetchInitialHistory();
    } catch (error: any) {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };


  useEffect(() => {
    if (!authLoading && user) {
        if(activeTab === 'today') {
            fetchDailyLog();
        } else if (activeTab === 'history') {
            if (searchQuery) {
                searchHistory(searchQuery);
            } else {
                fetchInitialHistory();
            }
        }
    }
  }, [user, authLoading, fetchDailyLog, fetchInitialHistory, searchHistory, activeTab, searchQuery]);

  useEffect(() => {
      if (!authLoading && user) {
          fetchUserData();
      }
  }, [user, authLoading, fetchUserData]);
  
  const handleFoodLogged = () => {
    fetchDailyLog();
  };
  
  const totalCaloriesToday = dailyLog.reduce((sum, log) => sum + log.calories, 0);
  const calorieTarget = profile?.dailyCalorieTarget || 0;
  const remainingCalories = calorieTarget - totalCaloriesToday;
  const progressPercentage = calorieTarget > 0 ? (totalCaloriesToday / calorieTarget) * 100 : 0;
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2"><Utensils />Calorie Tracking</CardTitle>
              {calorieTarget > 0 ? (
                <CardDescription>Your target for today is {calorieTarget} kcal.</CardDescription>
              ) : (
                <CardDescription>Set your profile to see a daily calorie target.</CardDescription>
              )}
            </div>
            <Button onClick={() => setIsAnalysisDialogOpen(true)} disabled={authLoading || !profile}>
              <PlusCircle className="mr-2 h-4 w-4" /> Track New Meal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Today's Log</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-4">
              {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div>}
              {!loading && (
                <>
                  {calorieTarget > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Consumed: {totalCaloriesToday} kcal</span>
                        <span className="text-muted-foreground">Remaining: {remainingCalories} kcal</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}
                  {dailyLog.length > 0 ? (
                    <div className="space-y-4">
                      <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {dailyLog.map(log => (
                          <li key={log.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                            <div>
                              <p className="font-semibold">{log.foodName}</p>
                              <p className="text-sm text-muted-foreground">{log.timestamp.toLocaleTimeString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium">{log.calories} kcal</p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete this food log entry.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No food logged yet today.</p>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-4">
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by food name..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div>}

              {!loading && (
                historyLog.length > 0 ? (
                    <div className="space-y-4">
                        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {historyLog.map(log => (
                            <li key={log.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                              <div>
                                <p className="font-semibold">{log.foodName}</p>
                                <p className="text-sm text-muted-foreground">{log.timestamp.toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{log.calories} kcal</p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete this food log entry.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </li>
                          ))}
                        </ul>
                    </div>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No food logs found.</p>
                )
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <FoodAnalysisDialog 
        open={isAnalysisDialogOpen} 
        onOpenChange={setIsAnalysisDialogOpen} 
        profile={{...profile, todaysCalories: totalCaloriesToday}} 
        latestHealthReport={latestHealthReport} 
        onFoodLogged={handleFoodLogged} 
      />
    </>
  );
}


// --- Meditation Tracking Components ---

const meditationTypes = [
  'Mindfulness', 'Guided', 'Breathing', 'Body Scan', 'Loving-Kindness',
  'Walking', 'Transcendental', 'Vipassanā', 'Yoga', 'Other',
];

const meditationLogSchema = z.object({
  meditationType: z.string().min(1, "Please select a meditation type."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  description: z.string().optional(),
});

type MeditationLogFormData = z.infer<typeof meditationLogSchema>;

interface MeditationLog {
  id: string;
  timestamp: Date;
  meditationType: string;
  duration: number;
  description?: string;
}

function AddMeditationDialog({ onMeditationLogged }: { onMeditationLogged: () => void }) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const form = useForm<MeditationLogFormData>({
    resolver: zodResolver(meditationLogSchema),
    defaultValues: { meditationType: '', duration: 10, description: '' },
  });

  async function onSubmit(values: MeditationLogFormData) {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'meditation-log'), {
        userId: user.uid,
        timestamp: new Date(),
        meditationType: values.meditationType,
        duration: values.duration,
        description: values.description,
      });
      toast({
        title: 'Meditation Logged',
        description: `Your ${values.duration}-minute ${values.meditationType} session has been saved.`,
      });
      form.reset();
      onMeditationLogged();
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Log Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Meditation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Meditation</DialogTitle>
          <DialogDescription>Record your meditation session here.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="meditationType" render={({ field }) => (
              <FormItem>
                <FormLabel>Type of Meditation</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl>
                  <SelectContent>{meditationTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="duration" render={({ field }) => (
              <FormItem><FormLabel>Duration (minutes)</FormLabel><FormControl><Input type="number" placeholder="15" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="How was your session?" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MeditationTracker() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dailyLog, setDailyLog] = useState<MeditationLog[]>([]);
  const [historyLog, setHistoryLog] = useState<MeditationLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  const fetchDailyLog = useCallback(async () => {
    if (user) {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'meditation-log'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        where('timestamp', '<', Timestamp.fromDate(tomorrow)),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setDailyLog(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: (doc.data().timestamp as Timestamp).toDate() })) as MeditationLog[]);
      setLoading(false);
    }
  }, [user]);

  const fetchHistory = useCallback(async (searchString?: string) => {
    if (user) {
      setLoading(true);
      let q;
      if (searchString && searchString.trim() !== '') {
         q = query(collection(db, 'meditation-log'), where('userId', '==', user.uid), orderBy('meditationType'), startAt(searchString), endAt(searchString + '\uf8ff'));
      } else {
        q = query(collection(db, 'meditation-log'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(10));
      }
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: (doc.data().timestamp as Timestamp).toDate() })) as MeditationLog[];
      setHistoryLog(logs);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
        if(activeTab === 'today') {
            fetchDailyLog();
        } else if (activeTab === 'history') {
            if (searchQuery) {
                fetchHistory(searchQuery);
            } else {
                fetchHistory();
            }
        }
    }
  }, [user, authLoading, fetchDailyLog, fetchHistory, activeTab, searchQuery]);

  const handleDelete = async (logId: string) => {
    try {
        await deleteDoc(doc(db, "meditation-log", logId));
        toast({ title: "Log Deleted", description: "The meditation log entry has been removed." });
        if (activeTab === 'today') fetchDailyLog();
        else fetchHistory(searchQuery);
    } catch (error: any) {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const handleMeditationLogged = () => {
    fetchDailyLog();
  }
  
  const renderLogList = (logs: MeditationLog[]) => (
    logs.length > 0 ? (
      <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {logs.map(log => (
          <li key={log.id} className="flex justify-between items-start p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="font-semibold">{log.meditationType}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1"><Clock size={14}/> {log.duration} minutes &bull; {log.timestamp.toLocaleDateString()}</p>
              {log.description && <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-2"><BookText size={14} className="mt-0.5 shrink-0"/><span>{log.description}</span></p>}
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this meditation log entry.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground text-center py-16">{searchQuery ? 'No meditations found.' : (activeTab === 'today' ? 'No meditations logged today.' : 'No meditations logged yet.')}</p>
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Brain />Meditation Log</CardTitle>
            <CardDescription>Track your meditation sessions to build a consistent practice.</CardDescription>
          </div>
          <AddMeditationDialog onMeditationLogged={handleMeditationLogged} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Today's Log</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-4">
                {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div> : renderLogList(dailyLog)}
            </TabsContent>
            <TabsContent value="history" className="mt-4">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by type..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div> : renderLogList(historyLog)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// --- Workout Tracking Components ---

const workoutTypes = [
  'Strength Training', 'Cardio', 'Yoga', 'Pilates', 'HIIT', 'CrossFit',
  'Running', 'Cycling', 'Swimming', 'Walking', 'Sports', 'Other',
];

const workoutLogSchema = z.object({
  workoutType: z.string().min(1, "Please select a workout type."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  caloriesBurned: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type WorkoutLogFormData = z.infer<typeof workoutLogSchema>;

interface WorkoutLog {
  id: string;
  timestamp: Date;
  workoutType: string;
  duration: number;
  caloriesBurned?: number;
  notes?: string;
}

function AddWorkoutDialog({ onWorkoutLogged }: { onWorkoutLogged: () => void }) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const form = useForm<WorkoutLogFormData>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: { workoutType: '', duration: 30, caloriesBurned: 0, notes: '' },
  });

  async function onSubmit(values: WorkoutLogFormData) {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'workout-log'), {
        userId: user.uid,
        timestamp: new Date(),
        workoutType: values.workoutType,
        duration: values.duration,
        caloriesBurned: values.caloriesBurned,
        notes: values.notes,
      });
      toast({ title: 'Workout Logged', description: `Your ${values.duration}-minute ${values.workoutType} session has been saved.` });
      form.reset();
      onWorkoutLogged();
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Log Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add Workout</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Workout</DialogTitle>
          <DialogDescription>Record your workout session here.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="workoutType" render={({ field }) => (
              <FormItem><FormLabel>Type of Workout</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl><SelectContent>{workoutTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem><FormLabel>Duration (minutes)</FormLabel><FormControl><Input type="number" placeholder="30" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="caloriesBurned" render={({ field }) => (
                <FormItem><FormLabel>Calories Burned</FormLabel><FormControl><Input type="number" placeholder="300" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="How was your workout?" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutTracker() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dailyLog, setDailyLog] = useState<WorkoutLog[]>([]);
  const [historyLog, setHistoryLog] = useState<WorkoutLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  const fetchDailyLog = useCallback(async () => {
    if (user) {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'workout-log'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        where('timestamp', '<', Timestamp.fromDate(tomorrow)),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setDailyLog(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: (doc.data().timestamp as Timestamp).toDate() })) as WorkoutLog[]);
      setLoading(false);
    }
  }, [user]);

  const fetchHistory = useCallback(async (searchString?: string) => {
    if (user) {
      setLoading(true);
      let q;
      if (searchString && searchString.trim() !== '') {
        q = query(collection(db, 'workout-log'), where('userId', '==', user.uid), orderBy('workoutType'), startAt(searchString), endAt(searchString + '\uf8ff'));
      } else {
        q = query(collection(db, 'workout-log'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(10));
      }
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: (doc.data().timestamp as Timestamp).toDate() })) as WorkoutLog[];
      setHistoryLog(logs);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
        if(activeTab === 'today') {
            fetchDailyLog();
        } else if (activeTab === 'history') {
            if (searchQuery) {
                fetchHistory(searchQuery);
            } else {
                fetchHistory();
            }
        }
    }
  }, [user, authLoading, fetchDailyLog, fetchHistory, activeTab, searchQuery]);

  const handleDelete = async (logId: string) => {
    try {
        await deleteDoc(doc(db, "workout-log", logId));
        toast({ title: "Log Deleted", description: "The workout log entry has been removed." });
        if (activeTab === 'today') fetchDailyLog();
        else fetchHistory(searchQuery);
    } catch (error: any) {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const handleWorkoutLogged = () => {
    fetchDailyLog();
  };

  const renderLogList = (logs: WorkoutLog[]) => (
    logs.length > 0 ? (
      <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {logs.map(log => (
          <li key={log.id} className="flex flex-col sm:flex-row justify-between items-start p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 mb-2 sm:mb-0">
              <p className="font-semibold">{log.workoutType}</p>
              <p className="text-sm text-muted-foreground">{log.timestamp.toLocaleDateString()}</p>
              {log.notes && <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-2"><BookText size={14} className="mt-0.5 shrink-0"/><span>{log.notes}</span></p>}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="flex items-center gap-1.5"><Clock size={14}/> {log.duration} min</span>
                {log.caloriesBurned && log.caloriesBurned > 0 && <span className="flex items-center gap-1.5"><Flame size={14}/> {log.caloriesBurned} kcal</span>}
              </div>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. This will permanently delete this workout log entry.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground text-center py-16">{searchQuery ? 'No workouts found.' : (activeTab === 'today' ? 'No workouts logged today.' : 'No workouts logged yet.')}</p>
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Dumbbell />Workout Log</CardTitle>
            <CardDescription>Track your workouts to monitor progress.</CardDescription>
          </div>
          <AddWorkoutDialog onWorkoutLogged={handleWorkoutLogged} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Today's Log</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-4">
                {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div> : renderLogList(dailyLog)}
            </TabsContent>
            <TabsContent value="history" className="mt-4">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by workout type..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div> : renderLogList(historyLog)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// --- Main Tracking Page Component ---
export default function TrackingPage() {
  return (
    <Tabs defaultValue="calorie" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="calorie"><Utensils className="mr-2 h-4 w-4"/>Calorie</TabsTrigger>
        <TabsTrigger value="workout"><Dumbbell className="mr-2 h-4 w-4"/>Workout</TabsTrigger>
        <TabsTrigger value="meditation"><Brain className="mr-2 h-4 w-4"/>Meditation</TabsTrigger>
      </TabsList>
      <TabsContent value="calorie" className="mt-4">
        <CalorieTracker />
      </TabsContent>
      <TabsContent value="workout" className="mt-4">
        <WorkoutTracker />
      </TabsContent>
      <TabsContent value="meditation" className="mt-4">
        <MeditationTracker />
      </TabsContent>
    </Tabs>
  )
}
