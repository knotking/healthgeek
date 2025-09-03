
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
import { Loader2, PlusCircle, Brain, Clock, Search, BookText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const meditationTypes = [
  'Mindfulness',
  'Guided',
  'Breathing',
  'Body Scan',
  'Loving-Kindness',
  'Walking',
  'Transcendental',
  'Vipassanā',
  'Yoga',
  'Other',
];

const logSchema = z.object({
  meditationType: z.string().min(1, "Please select a meditation type."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  description: z.string().optional(),
});

type LogFormData = z.infer<typeof logSchema>;

interface MeditationLog {
  id: string;
  timestamp: Date;
  meditationType: string;
  duration: number;
  description?: string;
}

function AddMeditationDialog({ onMeditationLogged }: { onMeditationLogged: () => void }) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const form = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      meditationType: '',
      duration: 10,
      description: '',
    },
  });

  async function onSubmit(values: LogFormData) {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'meditation-log'), {
        userId: user.uid,
        timestamp: new Date(),
        meditationType: values.meditationType,
        duration: values.duration,
        description: values.description,
      });
      toast({
        title: 'Meditation Logged',
        description: `Your ${values.duration}-minute ${values.meditationType} session has been saved.`,
      });
      form.reset();
      onMeditationLogged();
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add Meditation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Meditation</DialogTitle>
          <DialogDescription>
            Record your meditation session here. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="meditationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Meditation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meditationTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="How was your session? Any thoughts or feelings to note?"
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

export default function TrackMeditationPage() {
  const [user, authLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [historyLog, setHistoryLog] = useState<MeditationLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async (searchString?: string) => {
    if (user) {
      setLoading(true);
      let q;
      if (searchString && searchString.trim() !== '') {
         q = query(
            collection(db, 'meditation-log'),
            where('userId', '==', user.uid),
            orderBy('meditationType'),
            startAt(searchString),
            endAt(searchString + '\uf8ff')
        );
      } else {
        q = query(
          collection(db, 'meditation-log'),
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
      })) as MeditationLog[];
      setHistoryLog(logs);
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
        if (!authLoading && user) {
            fetchHistory(searchQuery);
        }
    }, 500); // Debounce search query by 500ms

    return () => clearTimeout(debounceTimer);
  }, [user, authLoading, fetchHistory, searchQuery]);


  const handleMeditationLogged = () => {
    fetchHistory();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Brain />Meditation Log</CardTitle>
            <CardDescription>Track your meditation sessions to build a consistent practice.</CardDescription>
          </div>
          <AddMeditationDialog onMeditationLogged={handleMeditationLogged} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by type or description..."
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
                  <li key={log.id} className="flex justify-between items-start p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{log.meditationType}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Clock size={14}/> {log.duration} minutes &bull; {log.timestamp.toLocaleDateString()}
                      </p>
                      {log.description && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-2">
                            <BookText size={14} className="mt-0.5 flex-shrink-0"/>
                            <span>{log.description}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-16">
                {searchQuery ? 'No meditations found for your search.' : 'No meditations logged yet.'}
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
