
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, getDocs, Timestamp, where, limit, addDoc } from 'firebase/firestore';
import { assessFood, FoodAssessorOutput } from '@/ai/flows/food-assessor';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Upload, Utensils, HeartPulse, ChefHat, CheckCircle, XCircle, VideoOff, History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface AssessmentLog extends FoodAssessorOutput {
  id: string;
  timestamp: Date;
}


export default function FoodAssessmentPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<FoodAssessorOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentLog[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!isCameraOpen) {
          if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
          }
          return;
      }
      
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera not supported on this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [isCameraOpen, toast]);

  const fetchUserDataAndHistory = useCallback(async () => {
    if (user) {
      setIsFetchingHistory(true);
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

        // Fetch assessment history
        const historyQuery = query(
            collection(db, 'food-assessments'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const historySnapshot = await getDocs(historyQuery);
        const history = historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp).toDate(),
        })) as AssessmentLog[];
        setAssessmentHistory(history);

      } catch (e: any) {
        toast({ title: 'Error', description: 'Failed to fetch user data or history.', variant: 'destructive' });
        console.error(e);
      } finally {
        setIsFetchingHistory(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserDataAndHistory();
    }
  }, [user, authLoading, fetchUserDataAndHistory]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setSelectedImage(dataUri);
        handleAssessment(dataUri);
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
            handleAssessment(dataUri);
        }
        setIsCameraOpen(false);
    }
  };

  const saveAssessment = async (result: FoodAssessorOutput) => {
      if(!user) return;
      try {
          await addDoc(collection(db, 'food-assessments'), {
              userId: user.uid,
              timestamp: new Date(),
              ...result
          });
          fetchUserDataAndHistory(); // Refresh history
      } catch (e: any) {
          toast({ title: 'History Error', description: 'Failed to save assessment to your history.', variant: 'destructive'});
      }
  }


  const handleAssessment = async (imageDataUri: string) => {
    if (!profile) {
      toast({
        title: 'Profile Not Found',
        description: 'Please complete your profile before assessing food.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setAssessmentResult(null);
    try {
      const result = await assessFood({
        photoDataUri: imageDataUri,
        userProfile: JSON.stringify(profile),
        latestHealthReport: latestHealthReport ? JSON.stringify(latestHealthReport) : undefined,
      });
      setAssessmentResult(result);
      await saveAssessment(result);
    } catch (e: any) {
      setError('Failed to assess food. Please try again.');
      console.error(e);
      toast({ title: 'Assessment Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setAssessmentResult(null);
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
        <CardTitle>Food Assessment</CardTitle>
        <CardDescription>Upload or take a photo of your food to get an AI-powered health assessment and recipe ideas based on your profile.</CardDescription>
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
                <p>Assessing your food, please wait...</p>
              </div>
            )}
            {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            {assessmentResult && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Utensils /> {assessmentResult.foodName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`flex items-center gap-2 font-semibold ${assessmentResult.isHealthyChoice ? 'text-green-500' : 'text-red-500'}`}>
                      {assessmentResult.isHealthyChoice ? <CheckCircle /> : <XCircle />}
                      <span>{assessmentResult.isHealthyChoice ? 'Healthy Choice' : 'Not the Best Choice'}</span>
                    </div>
                    <div className="flex items-start gap-2"><HeartPulse /> <strong>Health Assessment:</strong> <p className="text-sm">{assessmentResult.healthAssessment}</p></div>
                  </CardContent>
                </Card>
                <Card>
                   <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ChefHat /> Recipe Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc space-y-2 pl-5">
                        {assessmentResult.recipeSuggestions.map((recipe, index) => (
                          <li key={index} className="text-sm">{recipe}</li>
                        ))}
                      </ul>
                    </CardContent>
                </Card>
                 <Button variant="outline" onClick={resetState} className="w-full">
                    Assess Another Food
                </Button>
              </div>
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

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History /> Assessment History</CardTitle>
        <CardDescription>View your recently assessed food items.</CardDescription>
      </CardHeader>
      <CardContent>
        {isFetchingHistory ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
        ) : assessmentHistory.length > 0 ? (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
            {assessmentHistory.map(item => (
              <Card key={item.id} className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {item.foodName}
                    <span className={`text-sm font-semibold flex items-center gap-1.5 ${item.isHealthyChoice ? 'text-green-500' : 'text-red-500'}`}>
                      {item.isHealthyChoice ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {item.isHealthyChoice ? 'Healthy' : 'Not Ideal'}
                    </span>
                  </CardTitle>
                  <CardDescription>{item.timestamp.toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.healthAssessment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No assessments in your history yet.</p>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
            <Button onClick={handleTakePhoto} disabled={hasCameraPermission !== true}>
              <Camera className="mr-2 h-4 w-4" /> Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
