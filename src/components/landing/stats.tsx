
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, ClipboardList, Dumbbell, UtensilsCrossed, BrainCircuit } from "lucide-react";

async function getStats() {
    try {
        const foodLogsQuery = collection(db, 'food-log');
        const healthReportsQuery = collection(db, 'health-reports');
        const workoutsQuery = query(collection(db, 'recommendation-history'), where('type', '==', 'workout'));
        const meditationsQuery = query(collection(db, 'recommendation-history'), where('type', '==', 'meditation'));
        const recipesQuery = query(collection(db, 'recommendation-history'), where('type', '==', 'recipe'));

        const [
            foodLogsSnap,
            healthReportsSnap,
            workoutsSnap,
            meditationsSnap,
            recipesSnap
        ] = await Promise.all([
            getCountFromServer(foodLogsQuery),
            getCountFromServer(healthReportsQuery),
            getCountFromServer(workoutsQuery),
            getCountFromServer(meditationsQuery),
            getCountFromServer(recipesQuery)
        ]);

        return {
            meals: foodLogsSnap.data().count,
            reports: healthReportsSnap.data().count,
            workouts: workoutsSnap.data().count,
            meditations: meditationsSnap.data().count,
            recipes: recipesSnap.data().count
        };
    } catch (error) {
        console.error("Error fetching stats:", error);
        // Return zeros or handle error as appropriate
        return { meals: 0, reports: 0, workouts: 0, meditations: 0, recipes: 0 };
    }
}


export default async function Stats() {
    const stats = await getStats();

    const statItems = [
        { icon: <UtensilsCrossed className="w-12 h-12 text-primary" />, value: stats.meals, label: "Meals Logged" },
        { icon: <ClipboardList className="w-12 h-12 text-primary" />, value: stats.reports, label: "Reports Analyzed" },
        { icon: <Dumbbell className="w-12 h-12 text-primary" />, value: stats.workouts, label: "Workouts Created" },
        { icon: <BrainCircuit className="w-12 h-12 text-primary" />, value: stats.meditations, label: "Meditations Guided" },
        { icon: <ChefHat className="w-12 h-12 text-primary" />, value: stats.recipes, label: "Recipes Generated" }
    ];

    return (
        <section id="stats" className="container py-24 sm:py-32">
            <h2 className="text-3xl md:text-4xl font-bold text-center">Join Our Growing Community</h2>
            <p className="md:w-3/4 mx-auto mt-4 mb-12 text-xl text-muted-foreground text-center">
                Our users are actively tracking their health and reaching their goals. Here are some of our platform's stats.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {statItems.map((item) => (
                    <Card key={item.label} className="bg-muted/50 flex flex-col items-center text-center p-6">
                        <CardHeader className="p-0">
                            {item.icon}
                        </CardHeader>
                        <CardContent className="pt-4 p-0">
                            <p className="text-4xl font-bold">{item.value.toLocaleString()}</p>
                            <p className="text-muted-foreground mt-2">{item.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
