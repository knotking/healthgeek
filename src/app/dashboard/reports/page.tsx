
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileDown, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Label } from '@/components/ui/label';

interface FoodLog {
  id: string;
  timestamp: Date | Timestamp;
  foodName: string;
  calories: number;
}

interface Recommendation {
    id: string;
    timestamp: Timestamp;
    type: 'workout' | 'meditation' | 'recipe';
    data: any;
}

interface UserProfile {
  name: string;
  dailyCalorieTarget: number;
  [key: string]: any;
}

export default function ReportsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState<'calorie' | 'recommendation' | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const fetchUserData = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        }
      } catch (e: any) {
        toast({ title: 'Error', description: 'Failed to fetch user data.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    }
  }, [user, authLoading, fetchUserData]);

  const handleGenerateCalorieReport = async () => {
    if (!user || !date?.from || !date?.to || !profile) {
      toast({ title: 'Error', description: 'Please select a valid date range.', variant: 'destructive' });
      return;
    }
    setReportLoading('calorie');

    try {
      const q = query(
        collection(db, 'food-log'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(date.from)),
        where('timestamp', '<=', Timestamp.fromDate(date.to)),
        orderBy('timestamp', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => doc.data() as FoodLog);

      if (logs.length === 0) {
        toast({ title: 'No Data', description: 'No food logs found in the selected date range.' });
        setReportLoading(null);
        return;
      }

      const doc = new jsPDF();
      
      const fromDate = format(date.from, "PPP");
      const toDate = format(date.to, "PPP");

      doc.setFontSize(18);
      doc.text("Calorie Intake Report", 14, 22);
      doc.setFontSize(11);
      doc.text(`User: ${profile.name}`, 14, 30);
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, 36);

      const tableColumn = ["Date", "Food Item", "Calories (kcal)"];
      const tableRows: any[][] = [];

      let totalCalories = 0;
      logs.forEach(log => {
        const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
        const row = [
          format(logDate, 'yyyy-MM-dd HH:mm'),
          log.foodName,
          log.calories,
        ];
        tableRows.push(row);
        totalCalories += log.calories;
      });

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
      });

      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.text(`Total Calorie Intake: ${totalCalories} kcal`, 14, finalY + 10);
      
      const numberOfDays = (date.to.getTime() - date.from.getTime()) / (1000 * 3600 * 24) + 1;
      const avgDailyCalories = totalCalories / numberOfDays;
      doc.text(`Average Daily Intake: ${avgDailyCalories.toFixed(2)} kcal/day`, 14, finalY + 16);


      if(profile.dailyCalorieTarget) {
          const targetTotal = profile.dailyCalorieTarget * numberOfDays;
          doc.text(`Target for Period: ~${targetTotal.toFixed(0)} kcal (${profile.dailyCalorieTarget} kcal/day)`, 14, finalY + 22);
          const difference = totalCalories - targetTotal;
          doc.text(`Difference from Target: ${difference.toFixed(2)} kcal`, 14, finalY + 28);

      }
      
      doc.save(`Calorie_Report_${profile.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    } catch (e: any) {
      toast({ title: 'Report Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      console.error(e);
    } finally {
      setReportLoading(null);
    }
  };

  const handleGenerateRecommendationsReport = async () => {
    if (!user || !date?.from || !date?.to || !profile) {
      toast({ title: 'Error', description: 'Please select a valid date range.', variant: 'destructive' });
      return;
    }
    setReportLoading('recommendation');

    try {
        const q = query(
            collection(db, 'recommendation-history'),
            where('userId', '==', user.uid),
            where('timestamp', '>=', Timestamp.fromDate(date.from)),
            where('timestamp', '<=', Timestamp.fromDate(date.to)),
            orderBy('timestamp', 'asc')
        );
        const querySnapshot = await getDocs(q);
        const recommendations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recommendation));

        if (recommendations.length === 0) {
            toast({ title: 'No Data', description: 'No saved recommendations found in the selected date range.' });
            setReportLoading(null);
            return;
        }

        const doc = new jsPDF();
        let finalY = 0;

        const fromDate = format(date.from, "PPP");
        const toDate = format(date.to, "PPP");

        doc.setFontSize(18);
        doc.text("Recommendations Report", 14, 22);
        doc.setFontSize(11);
        doc.text(`User: ${profile.name}`, 14, 30);
        doc.text(`Period: ${fromDate} to ${toDate}`, 14, 36);
        finalY = 40;

        const addSection = (title: string, items: Recommendation[]) => {
            if (items.length === 0) return;
            if (finalY > 250) doc.addPage();
            doc.setFontSize(14);
            doc.text(title, 14, finalY + 10);
            finalY += 15;

            items.forEach(item => {
                if (finalY > 260) {
                    doc.addPage();
                    finalY = 20;
                }
                const itemDate = format(item.timestamp.toDate(), 'yyyy-MM-dd');
                let name = '';
                if(item.type === 'workout') name = item.data.planTitle;
                if(item.type === 'meditation') name = item.data.title;
                if(item.type === 'recipe') name = item.data.name;

                doc.setFontSize(12);
                doc.text(`${itemDate}: ${name}`, 16, finalY);
                finalY += 8;
            });
        };

        addSection("Workouts", recommendations.filter(r => r.type === 'workout'));
        addSection("Meditations", recommendations.filter(r => r.type === 'meditation'));
        addSection("Recipes", recommendations.filter(r => r.type === 'recipe'));
        
        doc.save(`Recommendations_Report_${profile.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    } catch (e: any) {
        toast({ title: 'Report Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
        console.error(e);
    } finally {
        setReportLoading(null);
    }
  }
  
  if (loading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>Select a date range for your reports.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-start gap-4">
                    <Label>Select Date Range</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>Calorie Intake Report</CardTitle>
                    <CardDescription>Generate a PDF report of your calorie intake for a specific period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateCalorieReport} disabled={!!reportLoading}>
                    {reportLoading === 'calorie' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Generate PDF
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Recommendations Report</CardTitle>
                    <CardDescription>Generate a PDF of all saved workouts, meditations, and recipes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateRecommendationsReport} disabled={!!reportLoading}>
                    {reportLoading === 'recommendation' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Generate PDF
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}