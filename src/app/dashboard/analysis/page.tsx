
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, query, orderBy, getDocs, Timestamp, where, limit } from 'firebase/firestore';
import { analyzeHealthReport, HealthReportAnalysisOutput } from '@/ai/flows/health-report-analyzer';
import { analyzeFood, FoodAnalysisOutput } from '@/ai/flows/food-analyzer';
import { analyzePosture, PostureAnalysisOutput } from '@/ai/flows/posture-analyzer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileScan, Beaker, PlusCircle, History, Lightbulb, Camera, Utensils, Zap, HeartPulse, Video, VideoOff, RefreshCw, Sparkles, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// --- Health Report Analysis ---
interface HealthReportLog extends HealthReportAnalysisOutput {
  id: string;
  timestamp: Date;
}

function NumberAnalysis() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HealthReportAnalysisOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [reportHistory, setReportHistory] = useState<HealthReportLog[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserAndReports = useCallback(async () => {
    if (user) {
      setIsFetchingHistory(true);
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        } else {
           toast({ title: 'Profile Not Found', description: 'Please complete your profile first.', variant: 'destructive' });
        }

        const reportsQuery = query(
          collection(db, 'health-reports'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const history = reportsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp).toDate(),
        })) as HealthReportLog[];
        setReportHistory(history);

      } catch (e: any) {
        toast({ title: 'Error', description: 'Failed to fetch user data or reports.', variant: 'destructive' });
        console.error(e);
      } finally {
        setIsFetchingHistory(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserAndReports();
    } else if (!authLoading && !user) {
      setIsFetchingHistory(false);
    }
  }, [user, authLoading, fetchUserAndReports]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        if (file.type.startsWith('image/')) {
          setSelectedImage(dataUri);
        } else {
          setSelectedImage(null);
        }
        handleAnalysis(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async (imageDataUri: string) => {
     if (!profile) {
      toast({ title: 'Profile Not Found', description: 'Cannot analyze report without a user profile.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeHealthReport({
        reportPhotoDataUri: imageDataUri,
        existingProfile: JSON.stringify(profile),
      });
      setAnalysisResult(result);
    } catch (e: any) {
      setError('Failed to analyze report. Please try again.');
      toast({ title: 'Analysis Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCommitReport = async () => {
    if (!user || !analysisResult) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'health-reports'), {
        userId: user.uid,
        timestamp: new Date(),
        summary: analysisResult.summary,
        extractedMetrics: analysisResult.extractedMetrics,
        profileUpdateSuggestions: analysisResult.profileUpdateSuggestions,
      });
      toast({ title: 'Report Saved', description: 'Your health report analysis has been saved.' });
      resetState();
      fetchUserAndReports();
    } catch(e:any) {
      toast({ title: 'Save Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileUpdate = async () => {
    if (!user || !profile || !analysisResult?.profileUpdateSuggestions) return;
    setLoading(true);
    try {
        const newHealthIssues = Array.from(new Set([...profile.healthIssues, ...analysisResult.profileUpdateSuggestions.healthIssues]));
        
        await setDoc(doc(db, 'profiles', user.uid), {
            ...profile,
            healthIssues: newHealthIssues
        }, { merge: true });

        toast({ title: 'Profile Updated', description: 'Your health issues have been updated based on the report.' });
        fetchUserAndReports();
    } catch (e: any) {
        toast({ title: 'Update Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }

  const resetState = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Health Report Number Analysis</CardTitle>
          <CardDescription>Upload a photo or document of your health report (e.g., blood work) for an AI-powered analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          {!analysisResult && !loading ? (
             <div className="flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-lg">
                <FileScan className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">Upload a clear picture or document of your health report</p>
                <input type="file" accept="image/*,application/pdf,.doc,.docx" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={loading || authLoading || !profile}>
                  <Upload className="mr-2 h-4 w-4" /> Upload Report
                </Button>
                 {!profile && !authLoading && <p className="text-sm text-destructive">Please complete your profile first.</p>}
             </div>
          ) : (
             <div className="space-y-4">
                {selectedImage && (
                    <Image
                        src={selectedImage}
                        alt="Uploaded health report"
                        width={500}
                        height={700}
                        className="rounded-lg object-contain w-full max-h-[500px]"
                    />
                )}
                 {loading && !analysisResult && (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Analyzing your report...</p>
                    <p className="text-sm">This may take a moment.</p>
                  </div>
                )}
                {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

                {analysisResult && (
                    <div className="space-y-6">
                        <Card>
                          <CardHeader>
                              <CardTitle className="flex items-center gap-2"><Beaker /> Analysis Results</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div>
                                  <h4 className="font-semibold mb-2">Summary</h4>
                                  <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                              </div>
                              <Separator />
                              <div>
                                  <h4 className="font-semibold mb-2">Extracted Metrics</h4>
                                  <ul className="space-y-2">
                                      {analysisResult.extractedMetrics.map((metric, index) => (
                                          <li key={`${metric.name}-${index}`} className="flex justify-between text-sm p-2 bg-muted/50 rounded-md">
                                            <span><strong>{metric.name}:</strong> {metric.value}</span>
                                            <span className="font-medium">{metric.interpretation}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              {analysisResult.profileUpdateSuggestions.healthIssues.length > 0 && (
                                <>
                                  <Separator />
                                  <Alert>
                                    <Lightbulb className="h-4 w-4"/>
                                    <AlertTitle>Profile Update Suggestion</AlertTitle>
                                    <AlertDescription>
                                        <p>We suggest adding the following health issues to your profile: {analysisResult.profileUpdateSuggestions.healthIssues.join(', ')}.</p>
                                        <Button size="sm" className="mt-2" onClick={handleProfileUpdate} disabled={loading}>
                                          <PlusCircle className="mr-2 h-4 w-4"/> Update Profile
                                        </Button>
                                    </AlertDescription>
                                  </Alert>
                                </>
                              )}
                          </CardContent>
                        </Card>
                        <div className="flex gap-2">
                            <Button onClick={handleCommitReport} disabled={loading} className="w-full">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Report to History
                            </Button>
                             <Button variant="outline" onClick={resetState} className="w-full">
                                Analyze Another Report
                            </Button>
                        </div>
                    </div>
                )}
             </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History /> Analysis History</CardTitle>
          <CardDescription>View your previously analyzed health reports.</CardDescription>
        </CardHeader>
        <CardContent>
            {isFetchingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              </div>
            ) : reportHistory.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {reportHistory.map(report => (
                        <AccordionItem value={report.id} key={report.id}>
                            <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4">
                                  <span>Report from {report.timestamp.toLocaleDateString()}</span>
                                  <span className="text-muted-foreground text-sm">{report.timestamp.toLocaleTimeString()}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="px-4 py-2 space-y-4">
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2">Summary</h4>
                                      <p className="text-sm text-muted-foreground mb-4">{report.summary}</p>
                                    </div>
                                    <Separator className="my-4"/>
                                    <div>
                                       <h4 className="font-semibold text-sm mb-2">Extracted Metrics</h4>
                                        <ul className="space-y-2">
                                            {report.extractedMetrics.map((metric, index) => (
                                                <li key={`${metric.name}-${index}`} className="flex justify-between text-xs p-2 bg-background/50 rounded-md">
                                                  <span><strong>{metric.name}:</strong> {metric.value}</span>
                                                  <span className="font-medium">{metric.interpretation}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
               <p className="text-muted-foreground text-center py-8">No reports analyzed yet.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Food Analysis ---
function FoodAnalysis() {
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
        toast({ title: 'Error', description: 'Failed to fetch user data.', variant: 'destructive' });
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

// --- Posture Analysis ---
function PostureAnalysis() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [question, setQuestion] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PostureAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchUserData = useCallback(async () => {
    if (user) {
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
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    }
  }, [user, authLoading, fetchUserData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - recordingStartTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      toast({
        title: "Camera Access Denied",
        description: "Please enable camera permissions in your browser settings.",
        variant: "destructive"
      });
      return null;
    }
  };

  const startRecording = async () => {
    const stream = await startCamera();
    if (stream && videoRef.current) {
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setRecordedVideo(reader.result as string);
        };
      };
      
      recorder.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setElapsedTime(0);
      setRecordedVideo(null);
      setAnalysisResult(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingStartTime(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleAnalysis = async () => {
    if (!recordedVideo || !question || !profile) {
      toast({
        title: "Missing Information",
        description: "Please record a video and ask a question before analyzing.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzePosture({
        videoDataUri: recordedVideo,
        question: question,
        userProfile: JSON.stringify(profile)
      });
      setAnalysisResult(result);
    } catch (e: any) {
      setError('Failed to analyze posture. Please try again.');
      toast({ title: 'Analysis Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetAll = () => {
    setIsRecording(false);
    setRecordedVideo(null);
    setMediaRecorder(null);
    setAnalysisResult(null);
    setQuestion('');
    setError(null);
    setLoading(false);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Posture Analysis</CardTitle>
          <CardDescription>Record a video of your posture, ask a question, and get AI-powered feedback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {!recordedVideo ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-lg bg-muted/50">
                    <video ref={videoRef} className={`w-full max-w-md rounded-lg ${!isRecording ? 'hidden' : ''}`} autoPlay muted playsInline />
                    {!isRecording && <Camera className="w-16 h-16 text-muted-foreground" />}
                    {isRecording && <Badge variant="destructive" className="animate-pulse">{formatTime(elapsedTime)}</Badge>}
                    <p className="text-muted-foreground">
                        {isRecording ? "Recording your posture..." : "Click to start recording"}
                    </p>
                    <Button onClick={isRecording ? stopRecording : startRecording} disabled={loading || authLoading || !profile}>
                        {isRecording ? <VideoOff className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4" />}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                    {!profile && !authLoading && <p className="text-sm text-destructive">Please complete your profile first.</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    <video src={recordedVideo} className="w-full max-w-md mx-auto rounded-lg" controls />
                    <Button variant="outline" onClick={resetAll} className="w-full">Record Again</Button>
                </div>
            )}
        </CardContent>
      </Card>

      {recordedVideo && !analysisResult && (
        <Card>
            <CardHeader>
                <CardTitle>Ask about your posture</CardTitle>
                <CardDescription>What do you want to know? For example, "Is my back straight?" or "Are my shoulders rounded?"</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    <Textarea 
                        placeholder="Type your question here..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows={3}
                        disabled={loading}
                    />
                    <Button onClick={handleAnalysis} disabled={loading || !question}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Analyze My Posture
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}

      {loading && (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Analyzing your posture...</p>
            <p className="text-sm">This may take a moment.</p>
          </div>
      )}

      {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles /> Analysis & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Analysis</h3>
              <p className="text-muted-foreground">{analysisResult.analysis}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Recommendations</h3>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


export default function AnalysisPage() {
  return (
    <Tabs defaultValue="number" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="number">Number Analysis</TabsTrigger>
        <TabsTrigger value="food">Food Analysis</TabsTrigger>
        <TabsTrigger value="posture">Posture Analysis</TabsTrigger>
      </TabsList>
      <TabsContent value="number" className="mt-4">
        <NumberAnalysis />
      </TabsContent>
      <TabsContent value="food" className="mt-4">
        <FoodAnalysis />
      </TabsContent>
      <TabsContent value="posture" className="mt-4">
        <PostureAnalysis />
      </TabsContent>
    </Tabs>
  );
}
