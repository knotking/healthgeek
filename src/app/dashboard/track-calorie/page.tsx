
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, startAt, endAt } from 'firebase/firestore';
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
import { Loader2, Camera, Upload, Utensils, Zap, HeartPulse, List, AlertTriangle, Video, VideoOff, RefreshCw, PlusCircle, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { startOfDay, endOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';


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


export default function TrackCaloriePage() {
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
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(new Date());

      const q = query(
        collection(db, 'food-log'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        where('timestamp', '<=', Timestamp.fromDate(tomorrow)),
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
      <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today's Log</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2"><List/>Today's Food Log</CardTitle>
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
                            <p className="font-medium">{log.calories} kcal</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No food logged yet today.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Log History</CardTitle>
              <CardDescription>Review your past food logs. Showing 10 most recent by default.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
             <div className="relative">
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
                              <p className="font-medium">{log.calories} kcal</p>
                            </li>
                          ))}
                        </ul>
                    </div>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No food logs found.</p>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
