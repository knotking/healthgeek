
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PieChart, Utensils, Dumbbell, BrainCircuit, FileScan, ChefHat, Star, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Insights {
    foodLogs: number;
    workoutLogs: number;
    meditationLogs: number;
    healthReports: number;
    savedRecipes: number;
    savedWorkouts: number;
    savedMeditations: number;
    savedHabitPlans: number;
    quizzesTaken: number;
}

export default function InsightsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const fetchInsights = useCallback(async (userId: string) => {
    setInsightsLoading(true);
    try {
        const collections = {
            foodLogs: collection(db, 'food-log'),
            workoutLogs: collection(db, 'workout-log'),
            meditationLogs: collection(db, 'meditation-log'),
            healthReports: collection(db, 'health-reports'),
            recommendations: collection(db, 'recommendation-history'),
            quizzes: collection(db, 'saved-quizzes'),
        };

        const queries = Object.entries(collections).reduce((acc, [key, coll]) => {
            acc[key as keyof typeof collections] = query(coll, where('userId', '==', userId));
            return acc;
        }, {} as Record<keyof typeof collections, any>);

        const [
            foodLogsSnap,
            workoutLogsSnap,
            meditationLogsSnap,
            healthReportsSnap,
            recommendationsSnap,
            quizzesSnap,
        ] = await Promise.all(Object.values(queries).map(q => getDocs(q)));

        const recommendationData = recommendationsSnap.docs.map(doc => doc.data());

        setInsights({
            foodLogs: foodLogsSnap.size,
            workoutLogs: workoutLogsSnap.size,
            meditationLogs: meditationLogsSnap.size,
            healthReports: healthReportsSnap.size,
            savedRecipes: recommendationData.filter(d => d.type === 'recipe').length,
            savedWorkouts: recommendationData.filter(d => d.type === 'workout').length,
            savedMeditations: recommendationData.filter(d => d.type === 'meditation').length,
            savedHabitPlans: recommendationData.filter(d => d.type === 'habit').length,
            quizzesTaken: quizzesSnap.size,
        });

    } catch (e: any) {
        console.error("Error fetching insights:", e);
        toast({ title: 'Error fetching insights', description: e.message, variant: 'destructive' });
    } finally {
        setInsightsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (!authLoading && user) {
      fetchInsights(user.uid);
    } else if (!authLoading && !user) {
      setInsightsLoading(false);
    }
  }, [user, authLoading, fetchInsights]);

  return (
    <Card>
      <CardHeader>
          <CardTitle className="flex items-center gap-2"><PieChart/> Your Health Insights</CardTitle>
          <CardDescription>A quick overview of your activities on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
          {insightsLoading ? (
              <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              </div>
          ) : insights ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tracking</CardTitle>
                        <Utensils className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="space-y-1">
                          <p className="flex justify-between text-sm"><span>Meals</span> <strong>{insights.foodLogs}</strong></p>
                          <p className="flex justify-between text-sm"><span>Workouts</span> <strong>{insights.workoutLogs}</strong></p>
                          <p className="flex justify-between text-sm"><span>Meditations</span> <strong>{insights.meditationLogs}</strong></p>
                      </CardContent>
                  </Card>
                   <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Analysis</CardTitle>
                        <FileScan className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="space-y-1">
                         <p className="flex justify-between text-sm"><span>Health Reports</span> <strong>{insights.healthReports}</strong></p>
                      </CardContent>
                  </Card>
                  <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="space-y-1">
                          <p className="flex justify-between text-sm"><span>Recipes</span> <strong>{insights.savedRecipes}</strong></p>
                          <p className="flex justify-between text-sm"><span>Workouts</span> <strong>{insights.savedWorkouts}</strong></p>
                          <p className="flex justify-between text-sm"><span>Meditations</span> <strong>{insights.savedMeditations}</strong></p>
                          <p className="flex justify-between text-sm"><span>Habit Plans</span> <strong>{insights.savedHabitPlans}</strong></p>
                      </CardContent>
                  </Card>
                  <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Knowledge</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="space-y-1">
                          <p className="flex justify-between text-sm"><span>Quizzes Taken</span> <strong>{insights.quizzesTaken}</strong></p>
                      </CardContent>
                  </Card>
              </div>
          ) : (
              <p className="text-muted-foreground text-center py-8">Could not load insights.</p>
          )}
      </CardContent>
    </Card>
  )
}
