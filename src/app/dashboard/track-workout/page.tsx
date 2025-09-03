
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, startAt, endAt, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Dumbbell, Clock, Search, BookText, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const workoutTypes = [
  'Strength Training',
  'Cardio',
  'Yoga',
  'Pilates',
  'HIIT',
  'CrossFit',
  'Running',
  'Cycling',
  'Swimming',
  'Walking',
  'Sports',
  'Other',
];

const logSchema = z.object({
  workoutType: z.string().min(1, "Please select a workout type."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  caloriesBurned: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type LogFormData = z.infer<typeof logSchema>;

interface WorkoutLog {
  id: string;
  timestamp: Date;
  workoutType: string;
  duration: number;
  caloriesBurned?: number;
  notes?: string;
}

function AddWorkoutDialog({ onWorkoutLogged }: { onWorkoutLogged: () => void }) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const form = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      workoutType: '',
      duration: 30,
      caloriesBurned: 0,
      notes: '',
    },
  });

  async function onSubmit(values: LogFormData) {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'workout-log'), {
        userId: user.uid,
        timestamp: new Date(),
        workoutType: values.workoutType,
        duration: values.duration,
        caloriesBurned: values.caloriesBurned,
        notes: values.notes,
      });
      toast({
        title: 'Workout Logged',
        description: `Your ${values.duration}-minute ${values.workoutType} session has been saved.`,
      });
      form.reset();
      onWorkoutLogged();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Log Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Workout
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Workout</DialogTitle>
          <DialogDescription>
            Record your workout session here. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="workoutType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Workout</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workoutTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="caloriesBurned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories Burned</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="300" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="How was your workout? Any PBs or challenges?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Session
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TrackWorkoutPage() {
  const [user, authLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [historyLog, setHistoryLog] = useState<WorkoutLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async (searchString?: string) => {
    if (user) {
      setLoading(true);
      let q;
      if (searchString && searchString.trim() !== '') {
         q = query(
            collection(db, 'workout-log'),
            where('userId', '==', user.uid),
            orderBy('workoutType'),
            startAt(searchString),
            endAt(searchString + '\uf8ff')
        );
      } else {
        q = query(
          collection(db, 'workout-log'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toDate(),
      })) as WorkoutLog[];
      setHistoryLog(logs);
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
        if (!authLoading && user) {
            fetchHistory(searchQuery);
        }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [user, authLoading, fetchHistory, searchQuery]);


  const handleWorkoutLogged = () => {
    fetchHistory();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Dumbbell />Workout Log</CardTitle>
            <CardDescription>Track your workouts to monitor your progress and stay motivated.</CardDescription>
          </div>
          <AddWorkoutDialog onWorkoutLogged={handleWorkoutLogged} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by workout type..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div>}

        {!loading && (
          historyLog.length > 0 ? (
            <div className="space-y-4">
              <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {historyLog.map(log => (
                  <li key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <p className="font-semibold">{log.workoutType}</p>
                      <p className="text-sm text-muted-foreground">{log.timestamp.toLocaleDateString()}</p>
                       {log.notes && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-2">
                            <BookText size={14} className="mt-0.5 flex-shrink-0"/>
                            <span>{log.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1.5"><Clock size={14}/> {log.duration} min</span>
                        {log.caloriesBurned && log.caloriesBurned > 0 && <span className="flex items-center gap-1.5"><Flame size={14}/> {log.caloriesBurned} kcal</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-16">
                {searchQuery ? 'No workouts found for your search.' : 'No workouts logged yet.'}
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
