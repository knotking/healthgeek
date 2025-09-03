
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, where, limit, getDocs, addDoc } from 'firebase/firestore';
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
import { Loader2, Camera, Upload, Utensils, Zap, HeartPulse, VideoOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


export default function FoodAnalysisPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);

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

    getCameraPermission();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [isCameraOpen, toast, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const fetchUserData = useCallback(async () => {
    if (user) {
      try {
        // Fetch profile
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

        // Fetch latest health report
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
        toast({ title: 'Error', description: 'Failed to fetch user data.', variant: 'destructive' });
        console.error(e);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    }
  }, [user, authLoading, fetchUserData]);

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

    setLoading(true);
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
      setLoading(false);
    }
  };
  
    const handleCommit = async () => {
    if (!user || !analysisResult) return;
    setLoading(true);
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
    } catch (error: any) {
       toast({
        title: 'Commit Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
        setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <>
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Food Analysis</CardTitle>
        <CardDescription>Upload or take a photo of your food to get an AI-powered nutritional analysis based on your profile.</CardDescription>
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
            {loading && (
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
                      <div className="flex items-center gap-2"><Zap /> <strong>Calories:</strong> {analysisResult.calories} kcal</div>
                      <div className="flex items-start gap-2"><HeartPulse /> <strong>Health Impact:</strong> <p className="text-sm">{analysisResult.healthImpact}</p></div>
                      <div className="flex gap-2 mt-4">
                          <Button onClick={handleCommit} disabled={loading} className="w-full">
                              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Commit to Daily Log
                          </Button>
                          <Button variant="outline" onClick={resetState} className="w-full">
                              Analyze Another
                          </Button>
                      </div>
                  </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-lg">
            <Utensils className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">Take or upload a picture of a food item</p>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <div className="flex gap-2">
              <Button onClick={() => setIsCameraOpen(true)} disabled={loading || authLoading || !profile}>
                <Camera className="mr-2 h-4 w-4" /> Take Photo
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading || authLoading || !profile}>
                <Upload className="mr-2 h-4 w-4" /> Upload Photo
              </Button>
            </div>
            {!profile && !authLoading && <p className="text-sm text-destructive">Please complete your profile first.</p>}
          </div>
        )}
      </CardContent>
    </Card>

    </div>

    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take a Photo</DialogTitle>
            <DialogDescription>
              Center your food item in the frame and click capture.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white rounded-md">
                    <VideoOff className="w-12 h-12 mb-4" />
                    <p className="text-center">Camera access is denied.<br/> Please enable it in your browser settings.</p>
                </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={toggleCamera} disabled={hasCameraPermission !== true}>
                <RefreshCw className="mr-2 h-4 w-4" /> Switch Camera
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                <Button onClick={handleTakePhoto} disabled={hasCameraPermission !== true}>
                  <Camera className="mr-2 h-4 w-4" /> Capture
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    