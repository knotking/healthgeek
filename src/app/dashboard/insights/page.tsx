
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, format, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface FoodLog {
  id: string;
  timestamp: Date;
  calories: number;
}

interface CalorieChartData {
  date: string;
  calories: number;
}

interface HealthReportMetric {
    name: string;
    value: string;
    interpretation: string;
}

interface HealthReportLog {
    id: string;
    timestamp: Date;
    extractedMetrics: HealthReportMetric[];
}

interface MetricChartData {
    date: string;
    value: number;
}

export default function InsightsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calorieChartData, setCalorieChartData] = useState<CalorieChartData[]>([]);
  const [healthReports, setHealthReports] = useState<HealthReportLog[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [metricChartData, setMetricChartData] = useState<MetricChartData[]>([]);

  const processCalorieDataForChart = (logs: FoodLog[]): CalorieChartData[] => {
    const data: { [key: string]: number } = {};
    const today = startOfDay(new Date());

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

  const processMetricDataForChart = useCallback((metricName: string) => {
    if (!metricName) return;

    const data: MetricChartData[] = healthReports
      .map(report => {
        const metric = report.extractedMetrics.find(m => m.name === metricName);
        if (!metric) return null;

        const numericValue = parseFloat(metric.value);
        if (isNaN(numericValue)) return null;

        return {
          date: format(report.timestamp, 'MMM d, yyyy'),
          value: numericValue,
        };
      })
      .filter((item): item is MetricChartData => item !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setMetricChartData(data);
  }, [healthReports]);

  const fetchData = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        // Fetch Calorie Data
        const last7Days = subDays(new Date(), 7);
        const calorieQuery = query(
          collection(db, 'food-log'),
          where('userId', '==', user.uid),
          where('timestamp', '>=', Timestamp.fromDate(last7Days)),
          orderBy('timestamp', 'desc')
        );
        const calorieSnapshot = await getDocs(calorieQuery);
        const calorieLogs = calorieSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: (doc.data().timestamp as Timestamp).toDate(),
        })) as FoodLog[];
        setCalorieChartData(processCalorieDataForChart(calorieLogs));
        
        // Fetch Health Report Data
        const reportQuery = query(
          collection(db, 'health-reports'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'asc')
        );
        const reportSnapshot = await getDocs(reportQuery);
        const reports = reportSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp).toDate()
        })) as HealthReportLog[];
        setHealthReports(reports);

        // Process for metric chart
        const allMetrics = new Set<string>();
        reports.forEach(report => {
            report.extractedMetrics.forEach(metric => {
                // Ensure we only add metrics that have a parsable numeric value
                if (!isNaN(parseFloat(metric.value))) {
                    allMetrics.add(metric.name);
                }
            });
        });
        const metricNames = Array.from(allMetrics);
        setAvailableMetrics(metricNames);

        if (metricNames.length > 0) {
          setSelectedMetric(metricNames[0]);
        }

      } catch (e: any) {
        toast({ title: 'Error', description: 'Failed to fetch insights data.', variant: 'destructive' });
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
        fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, fetchData]);

  useEffect(() => {
    if (selectedMetric && healthReports.length > 0) {
      processMetricDataForChart(selectedMetric);
    }
  }, [selectedMetric, healthReports, processMetricDataForChart]);
  
  const handleMetricChange = (metricName: string) => {
    setSelectedMetric(metricName);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Health Insights</CardTitle>
          <CardDescription>Visualize your health data and track your progress over time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
            <Card>
              <CardHeader>
                <CardTitle>Daily Calorie Intake (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={calorieChartData}
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

            <Card>
                <CardHeader>
                    <CardTitle>Health Metric Trends</CardTitle>
                    <CardDescription>
                        {availableMetrics.length > 0 
                            ? "Select a metric from your health reports to see its trend over time."
                            : "No numerical health metrics found. Upload a health report to see trends."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {availableMetrics.length > 0 && (
                        <div className="mb-4 max-w-xs">
                             <Select onValueChange={handleMetricChange} defaultValue={selectedMetric || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a metric" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMetrics.map(metric => (
                                        <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {selectedMetric && metricChartData.length > 0 ? (
                        <div className="h-96 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={metricChartData}
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
                                    <Line type="monotone" dataKey="value" name={selectedMetric} stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : selectedMetric && !loading ? (
                         <div className="text-center text-muted-foreground py-16">
                            Not enough data to display a trend for &quot;{selectedMetric}&quot;.
                        </div>
                    ) : null}
                </CardContent>
            </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
