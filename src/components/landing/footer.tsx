import { Logo } from "@/components/logo";

export default function Footer() {
  return (
    <footer id="footer" className="border-t">
      <div className="container py-8 flex justify-between items-center">
        <div className="flex items-center">
            <Logo className="h-6 w-6 mr-2" />
            <span className="text-md font-bold">HealthGeek</span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} HealthGeek. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
