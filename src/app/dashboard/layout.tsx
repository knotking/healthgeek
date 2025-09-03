
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from '@/components/logo';
import { User, LogOut, Loader2, ClipboardList, Book, Settings, LifeBuoy, ChevronUp, Sparkles, Store, Handshake, BrainCircuit, PieChart } from 'lucide-react';
import { usePathname } from 'next/navigation';

function ProfileCompletionReminder({ profile, isOpen, onOpenChange, onGoToProfile }: { profile: any, isOpen: boolean, onOpenChange: (open: boolean) => void, onGoToProfile: () => void }) {
  if (!profile || profile.name) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            To get the most out of HealthGeek, please complete your profile. This will help us personalize your experience.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Later</Button>
          <Button onClick={onGoToProfile}>Go to Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileReminder, setShowProfileReminder] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        setUser(user);
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          setProfile(profileData);
          if (!profileData.name && pathname !== '/dashboard/analysis') {
            setShowProfileReminder(true);
          }
        } else {
          // If profile doesn't exist, it's a new signup
           const newProfileData = {
              email: user.email,
              name: '',
              age: 0,
              height: { value: 0, unit: 'CM' },
              weight: { current: 0, target: 0, unit: 'KG' },
              bmi: 0,
              healthIssues: [],
              diets: [],
              dailyCalorieTarget: 0,
            };
            await setDoc(doc(db, 'profiles', user.uid), newProfileData);
            setProfile(newProfileData);
            if(pathname !== '/dashboard/analysis') {
               setShowProfileReminder(true);
            }
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const handleGoToProfile = () => {
    setShowProfileReminder(false);
    router.push('/dashboard/analysis');
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ProfileCompletionReminder 
        profile={profile}
        isOpen={showProfileReminder}
        onOpenChange={setShowProfileReminder}
        onGoToProfile={handleGoToProfile}
      />
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-6" />
            <span className="text-lg font-semibold">HealthGeek</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/analysis')}>
                <Link href="/dashboard/analysis">
                  <PieChart />
                  Insights
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/tracking')}>
                  <Link href="/dashboard/tracking">
                    <ClipboardList />
                    Tracking
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/recommendations')}>
                <Link href="/dashboard/recommendations">
                  <Sparkles />
                  Recommendations
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/health-quiz')}>
                <Link href="/dashboard/health-quiz">
                  <BrainCircuit />
                  Health Quiz
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/reports')}>
                <Link href="/dashboard/reports">
                  <Book />
                  Reports
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/provider')}>
                <Link href="/dashboard/provider">
                  <Handshake />
                  Provider
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/marketplace')}>
                <Link href="/dashboard/marketplace">
                  <Store />
                  Market Place
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                    <Avatar className="size-8">
                        {profile?.name && profile.name.length > 0 ? <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${profile.name}`} /> : null}
                        <AvatarFallback>{profile?.name?.[0] || user?.email?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left grow overflow-hidden">
                        <span className="font-medium text-sm truncate">{profile?.name || 'User'}</span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                    <ChevronUp className="size-4 shrink-0"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--sidebar-width)] mb-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/support">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        <span>Support</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                     <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger className="md:hidden"/>
            <h1 className="text-lg font-semibold capitalize">{(pathname.split('/').pop() || 'dashboard').replace(/-/g, ' ')}</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
