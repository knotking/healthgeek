
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileDown, ChefHat, Calendar as CalendarIcon, Utensils, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateRecipes, RecipeGeneratorOutput } from '@/ai/flows/recipe-generator';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface FoodLog {
  id: string;
  timestamp: Date | Timestamp;
  foodName: string;
  calories: number;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestHealthReport, setLatestHealthReport] = useState<any>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });
  const [recipeResult, setRecipeResult] = useState<RecipeGeneratorOutput | null>(null);

  const fetchUserData = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
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
    setLoading(true);

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
        setLoading(false);
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
      setLoading(false);
    }
  };
  
  const handleGenerateRecipeReport = async () => {
    if (!profile) {
      toast({ title: 'Profile Not Found', description: 'Cannot generate recipes without a user profile.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setRecipeResult(null);
    try {
      const result = await generateRecipes({
        userProfile: JSON.stringify(profile),
        latestHealthReport: latestHealthReport ? JSON.stringify(latestHealthReport) : undefined,
      });
      setRecipeResult(result);
      toast({ title: "Recipes Generated!", description: "We've crafted some new ideas for you." });
    } catch(e: any) {
       toast({ title: 'Recipe Generation Failed', description: e.message || 'An error occurred.', variant: 'destructive' });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }


  return (
    <Tabs defaultValue="calorie">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="calorie">Calorie Report</TabsTrigger>
        <TabsTrigger value="recipe">Recipe Report</TabsTrigger>
      </TabsList>
      <TabsContent value="calorie">
        <Card>
          <CardHeader>
            <CardTitle>Calorie Intake Report</CardTitle>
            <CardDescription>Generate a PDF report of your calorie intake for a specific period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <Button onClick={handleGenerateCalorieReport} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Generate PDF
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="recipe">
        <Card>
          <CardHeader>
            <CardTitle>Personalized Recipe Report</CardTitle>
            <CardDescription>Generate new, healthy recipe ideas tailored to your health profile and goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button onClick={handleGenerateRecipeReport} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
              Generate Recipes
            </Button>
            
            {recipeResult && (
              <div className="space-y-6 pt-4">
                {recipeResult.recipes.map((recipe, index) => (
                    <Card key={index} className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Utensils /> {recipe.name}</CardTitle>
                            <CardDescription>{recipe.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-2 p-3 bg-background rounded-md">
                                <Sparkles className="h-5 w-5 mt-1 text-primary"/>
                                <div>
                                    <h4 className="font-semibold text-sm">Health Focus</h4>
                                    <p className="text-sm text-muted-foreground">{recipe.healthFocus}</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Ingredients</h4>
                                    <ul className="list-disc space-y-1 pl-5 text-sm">
                                        {recipe.ingredients.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Instructions</h4>
                                     <ol className="list-decimal space-y-2 pl-5 text-sm">
                                         {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                    </ol>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
              </div>
            )}

          </CardContent>
        </Card>
       </TabsContent>
    </Tabs>
  );
}
