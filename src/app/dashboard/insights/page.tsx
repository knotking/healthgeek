
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, format, startOfDay } from 'date-fns';

interface FoodLog {
  id: string;
  timestamp: Date;
  calories: number;
}

interface ChartData {
  date: string;
  calories: number;
}

export default function InsightsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const processDataForChart = (logs: FoodLog[]): ChartData[] => {
    const data: { [key: string]: number } = {};
    const today = startOfDay(new Date());

    // Initialize last 7 days with 0 calories
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(today, i), 'MMM d');
      data[date] = 0;
    }

    logs.forEach(log => {
      const date = format(log.timestamp, 'MMM d');
      if (data.hasOwnProperty(date)) {
        data[date] += log.calories;
      }
    });

    return Object.entries(data).map(([date, calories]) => ({ date, calories }));
  };
  
  const fetchCalorieData = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const last7Days = subDays(new Date(), 7);
        const q = query(
          collection(db, 'food-log'),
          where('userId', '==', user.uid),
          where('timestamp', '>=', Timestamp.fromDate(last7Days)),
          orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: (doc.data().timestamp as Timestamp).toDate(),
        })) as FoodLog[];
        
        const processedData = processDataForChart(logs);
        setChartData(processedData);

      } catch (e: any) {
        toast({ title: 'Error', description: 'Failed to fetch calorie data.', variant: 'destructive' });
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading && user) {
        fetchCalorieData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, fetchCalorieData]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Health Insights</CardTitle>
          <CardDescription>Visualize your health data and track your progress over time.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Daily Calorie Intake (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="calories" fill="hsl(var(--primary))" name="Calories (kcal)"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
