'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, getDocs, Timestamp, where, limit } from 'firebase/firestore';
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
import { Loader2, Camera, Upload, Utensils, HeartPulse, ChefHat, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

export default function FoodAssessmentPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<FoodAssessorOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserData = useCallback(async () => {
    if (user) {
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
        handleAssessment(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

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
    <Card>
      <CardHeader>
        <CardTitle>Food Assessment</CardTitle>
        <CardDescription>Upload a photo of your food to get an AI-powered health assessment and recipe ideas based on your profile.</CardDescription>
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
            <Camera className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">Take or upload a picture of a food item</p>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={loading || authLoading || !profile}>
              <Upload className="mr-2 h-4 w-4" /> Upload Photo
            </Button>
            {!profile && !authLoading && <p className="text-sm text-destructive">Please complete your profile first.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
