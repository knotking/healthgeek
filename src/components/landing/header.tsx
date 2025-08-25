import { Logo } from "@/components/logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <Logo className="h-6 w-6 mr-2" />
          <span className="font-bold">HealthGeek.ai</span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <div className="text-sm font-medium text-muted-foreground">
            Launching Soon
          </div>
        </div>
      </div>
    </header>
  );
}
