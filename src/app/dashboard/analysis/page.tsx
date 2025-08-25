import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AnalysisPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis</CardTitle>
        <CardDescription>This feature is currently under construction.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
        <Construction className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground">Coming Soon!</p>
      </CardContent>
    </Card>
  );
}
