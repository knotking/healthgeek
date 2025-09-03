
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileDown, Calendar as CalendarIcon, ArrowLeft, Utensils, Dumbbell, Brain, Heart, FileScan } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface FoodLog {
  id: string;
  timestamp: Date | Timestamp;
  foodName: string;
  calories: number;
}

interface WorkoutLog {
    id: string;
    timestamp: Timestamp;
    workoutType: string;
    duration: number;
    caloriesBurned?: number;
    notes?: string;
}

interface MeditationLog {
    id: string;
    timestamp: Timestamp;
    meditationType: string;
    duration: number;
    description?: string;
}

interface HealthReport {
    id: string;
    timestamp: Timestamp;
    summary: string;
    extractedMetrics: { name: string; value: string; interpretation: string }[];
}

interface Recommendation {
    id: string;
    timestamp: Timestamp;
    type: 'workout' | 'meditation' | 'recipe' | 'habit';
    data: any;
    rating: number;
}

interface UserProfile {
  name: string;
  dailyCalorieTarget: number;
  [key: string]: any;
}

type ReportType = 'calorie' | 'workout' | 'meditation' | 'recommendation' | 'health';

interface ReportData {
    type: ReportType;
    title: string;
    data: any[];
    dateRange: DateRange;
}

const reportTypes: { value: ReportType, label: string, icon: React.ElementType }[] = [
    { value: 'calorie', label: 'Calorie Intake Report', icon: Utensils },
    { value: 'workout', label: 'Workout Log Report', icon: Dumbbell },
    { value: 'meditation', label: 'Meditation Log Report', icon: Brain },
    { value: 'recommendation', label: 'Saved Recommendations Report', icon: Heart },
    { value: 'health', label: 'Health Numbers Report', icon: FileScan },
];

export default function ReportsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const fetchUserData = useCallback(async () => {
    if (user) {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as UserProfile);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData();
    }
  }, [user, authLoading, fetchUserData]);

  const handleGenerateReport = async () => {
    if (!user || !date?.from || !date?.to || !profile || !reportType) {
      toast({ title: 'Error', description: 'Please select a report type and a valid date range.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setReportData(null);

    try {
        let collectionName = '';
        let title = '';
        switch(reportType) {
            case 'calorie': collectionName = 'food-log'; title = 'Calorie Intake Report'; break;
            case 'workout': collectionName = 'workout-log'; title = 'Workout Log Report'; break;
            case 'meditation': collectionName = 'meditation-log'; title = 'Meditation Log Report'; break;
            case 'recommendation': collectionName = 'recommendation-history'; title = 'Saved Recommendations Report'; break;
            case 'health': collectionName = 'health-reports'; title = 'Health Numbers Report'; break;
        }

      const q = query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(date.from)),
        where('timestamp', '<=', Timestamp.fromDate(date.to)),
        orderBy('timestamp', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

      if (data.length === 0) {
        toast({ title: 'No Data', description: `No data found for "${title}" in the selected date range.` });
        return;
      }
      
      setReportData({ type: reportType, title, data, dateRange: date });

    } catch (e: any) {
      toast({ title: 'Report Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPdf = () => {
    if (!reportData || !profile) return;

    const doc = new jsPDF();
    const { from, to } = reportData.dateRange;
    const fromDate = from ? format(from, "PPP") : '';
    const toDate = to ? format(to, "PPP") : '';

    doc.setFontSize(18);
    doc.text(reportData.title, 14, 22);
    doc.setFontSize(11);
    doc.text(`User: ${profile.name}`, 14, 30);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 36);
    
    let finalY = 40;

    switch(reportData.type) {
        case 'calorie':
            const logs = reportData.data as FoodLog[];
            (doc as any).autoTable({
                head: [["Date", "Food Item", "Calories (kcal)"]],
                body: logs.map(log => {
                    const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
                    return [format(logDate, 'yyyy-MM-dd HH:mm'), log.foodName, log.calories];
                }),
                startY: 50
            });
            break;
        case 'workout':
             (doc as any).autoTable({
                head: [["Date", "Type", "Duration (min)", "Calories Burned", "Notes"]],
                body: (reportData.data as WorkoutLog[]).map(log => [
                    format((log.timestamp as Timestamp).toDate(), 'yyyy-MM-dd HH:mm'),
                    log.workoutType, log.duration, log.caloriesBurned || 'N/A', log.notes || 'N/A'
                ]),
                startY: 50
            });
            break;
        case 'meditation':
            (doc as any).autoTable({
                head: [["Date", "Type", "Duration (min)", "Description"]],
                body: (reportData.data as MeditationLog[]).map(log => [
                    format((log.timestamp as Timestamp).toDate(), 'yyyy-MM-dd HH:mm'),
                    log.meditationType, log.duration, log.description || 'N/A'
                ]),
                startY: 50
            });
            break;
        case 'health':
            (reportData.data as HealthReport[]).forEach((report, index) => {
                if (index > 0) doc.addPage();
                doc.setFontSize(14);
                doc.text(`Report from: ${format((report.timestamp as Timestamp).toDate(), 'PPP')}`, 14, finalY);
                finalY += 10;
                doc.setFontSize(11);
                const summaryLines = doc.splitTextToSize(report.summary, 180);
                doc.text(summaryLines, 14, finalY);
                finalY += summaryLines.length * 5 + 5;
                (doc as any).autoTable({
                    head: [["Metric", "Value", "Interpretation"]],
                    body: report.extractedMetrics.map(metric => [metric.name, metric.value, metric.interpretation]),
                    startY: finalY,
                });
                finalY = (doc as any).lastAutoTable.finalY + 10;
            });
            break;
        case 'recommendation':
             (doc as any).autoTable({
                head: [["Date", "Type", "Title/Name", "Rating"]],
                body: (reportData.data as Recommendation[]).map(rec => {
                    const name = rec.data.planTitle || rec.data.title || rec.data.name || 'N/A';
                    return [
                        format((rec.timestamp as Timestamp).toDate(), 'yyyy-MM-dd'),
                        rec.type, name, rec.rating > 0 ? `${rec.rating}/5` : 'Unrated'
                    ];
                }),
                startY: 50
            });
            break;
    }
    
    doc.save(`${reportData.type}_Report_${profile.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  const renderReportContent = () => {
    if (!reportData) return null;

    switch(reportData.type) {
        case 'calorie':
            const logs = reportData.data as FoodLog[];
            return <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Food</TableHead><TableHead className="text-right">Calories</TableHead></TableRow></TableHeader><TableBody>{logs.map(log => <TableRow key={log.id}><TableCell>{format(log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp), 'Pp')}</TableCell><TableCell>{log.foodName}</TableCell><TableCell className="text-right">{log.calories} kcal</TableCell></TableRow>)}</TableBody></Table>
        case 'workout':
            return <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Calories</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>{(reportData.data as WorkoutLog[]).map(log => <TableRow key={log.id}><TableCell>{format((log.timestamp as Timestamp).toDate(), 'Pp')}</TableCell><TableCell>{log.workoutType}</TableCell><TableCell>{log.duration} min</TableCell><TableCell>{log.caloriesBurned || 'N/A'}</TableCell><TableCell>{log.notes || 'N/A'}</TableCell></TableRow>)}</TableBody></Table>
        case 'meditation':
            return <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Description</TableHead></TableRow></TableHeader><TableBody>{(reportData.data as MeditationLog[]).map(log => <TableRow key={log.id}><TableCell>{format((log.timestamp as Timestamp).toDate(), 'Pp')}</TableCell><TableCell>{log.meditationType}</TableCell><TableCell>{log.duration} min</TableCell><TableCell>{log.description || 'N/A'}</TableCell></TableRow>)}</TableBody></Table>
        case 'health':
            return <div className="space-y-4">{ (reportData.data as HealthReport[]).map(report => <Card key={report.id}><CardHeader><CardTitle className="text-base">Report from {format((report.timestamp as Timestamp).toDate(), 'PPP')}</CardTitle><CardDescription>{report.summary}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Value</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody>{report.extractedMetrics.map((metric, i) => <TableRow key={i}><TableCell>{metric.name}</TableCell><TableCell>{metric.value}</TableCell><TableCell>{metric.interpretation}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>)}</div>
        case 'recommendation':
            return <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Rating</TableHead></TableRow></TableHeader><TableBody>{(reportData.data as Recommendation[]).map(rec => <TableRow key={rec.id}><TableCell>{format((rec.timestamp as Timestamp).toDate(), 'PPP')}</TableCell><TableCell className="capitalize">{rec.type}</TableCell><TableCell>{rec.data.planTitle || rec.data.title || rec.data.name}</TableCell><TableCell>{rec.rating > 0 ? `${rec.rating}/5` : 'Unrated'}</TableCell></TableRow>)}</TableBody></Table>
    }
    return null;
  }
  
  if (reportData) {
      return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{reportData.title}</CardTitle>
                        <CardDescription>
                            Showing data from {reportData.dateRange.from ? format(reportData.dateRange.from, 'LLL dd, y') : ''} to {reportData.dateRange.to ? format(reportData.dateRange.to, 'LLL dd, y') : ''}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setReportData(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                        <Button onClick={handleDownloadPdf}><FileDown className="mr-2 h-4 w-4" /> Download PDF</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {renderReportContent()}
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Generate a New Report</CardTitle>
            <CardDescription>Select a report type and a date range to generate and view your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select onValueChange={(value: ReportType) => setReportType(value)}>
                        <SelectTrigger id="report-type">
                            <SelectValue placeholder="Select a report type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {reportTypes.map(rt => (
                                <SelectItem key={rt.value} value={rt.value}>
                                    <div className="flex items-center gap-2">
                                        <rt.icon className="h-4 w-4" />
                                        {rt.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn( "w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>
                </div>
             </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleGenerateReport} disabled={loading || !reportType}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Report
            </Button>
        </CardFooter>
    </Card>
  );
}
