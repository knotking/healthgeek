'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, query, orderBy, getDocs, Timestamp, where } from 'firebase/firestore';
import { analyzeHealthReport, HealthReportAnalysisOutput } from '@/ai/flows/health-report-analyzer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileScan, Beaker, PlusCircle, History, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface HealthReportLog extends HealthReportAnalysisOutput {
  id: string;
  timestamp: Date;
}

export default function AnalysisPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HealthReportAnalysisOutput | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [reportHistory, setReportHistory] = useState<HealthReportLog[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserAndReports = useCallback(async () => {
    if (user) {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserAndReports();
    }
  }, [user, authLoading, fetchUserAndReports]);

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
      console.error(e);
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
      fetchUserAndReports(); // Refresh history
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
        fetchUserAndReports(); // Refresh profile state
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
          <CardTitle>Health Report Analysis</CardTitle>
          <CardDescription>Upload a photo of your health report (e.g., blood work) for an AI-powered analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedImage ? (
             <div className="flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-lg">
                <FileScan className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">Upload a clear picture of your health report</p>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={loading || authLoading || !profile}>
                  <Upload className="mr-2 h-4 w-4" /> Upload Report
                </Button>
                 {!profile && !authLoading && <p className="text-sm text-destructive">Please complete your profile first.</p>}
             </div>
          ) : (
             <div className="space-y-4">
                <Image
                    src={selectedImage}
                    alt="Uploaded health report"
                    width={500}
                    height={700}
                    className="rounded-lg object-contain w-full max-h-[500px]"
                />
                 {loading && !analysisResult && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p>Analyzing your report...</p>
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
                                      {analysisResult.extractedMetrics.map(metric => (
                                          <li key={metric.name} className="flex justify-between text-sm p-2 bg-muted/50 rounded-md">
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
            {loading && reportHistory.length === 0 && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
            {reportHistory.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {reportHistory.map(report => (
                        <Card key={report.id} className="bg-muted/30">
                            <CardHeader>
                                <CardTitle className="text-lg">Report from {report.timestamp.toLocaleDateString()}</CardTitle>
                                <CardDescription>{report.timestamp.toLocaleTimeString()}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold mb-2">Summary:</p>
                                <p className="text-sm text-muted-foreground mb-4">{report.summary}</p>
                                <p className="text-sm font-semibold mb-2">Metrics:</p>
                                <ul className="space-y-1 text-xs">
                                  {report.extractedMetrics.map(m => <li key={m.name}>- {m.name}: {m.value} ({m.interpretation})</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
               !loading && <p className="text-muted-foreground text-center py-8">No reports analyzed yet.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
