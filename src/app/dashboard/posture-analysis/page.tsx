
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { analyzePosture, PostureAnalysisOutput } from '@/ai/flows/posture-analyzer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Video, VideoOff, RefreshCw, Sparkles, Send, Mic } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function PostureAnalysisPage() {
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
      console.error("Error accessing camera: ", err);
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
        const videoUrl = URL.createObjectURL(blob);
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
      console.error(e);
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
