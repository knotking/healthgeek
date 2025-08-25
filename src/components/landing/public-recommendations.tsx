'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Star, Dumbbell, BrainCircuit, ChefHat } from 'lucide-react';
import { Badge } from '../ui/badge';

type RecommendationHistoryItem = {
    id: string;
    timestamp: Date;
    type: 'recipe' | 'workout' | 'meditation';
    data: any;
    isPublic?: boolean;
    rating?: number;
};

const getIcon = (type: string) => {
    switch (type) {
        case 'workout': return <Dumbbell className="h-6 w-6 text-primary" />;
        case 'meditation': return <BrainCircuit className="h-6 w-6 text-primary" />;
        case 'recipe': return <ChefHat className="h-6 w-6 text-primary" />;
        default: return null;
    }
}

const getTitle = (item: RecommendationHistoryItem) => {
    switch (item.type) {
        case 'workout': return item.data.planTitle;
        case 'meditation': return item.data.title;
        case 'recipe': return item.data.name;
        default: return "History Item";
    }
}

const getDescription = (item: RecommendationHistoryItem) => {
     switch (item.type) {
        case 'workout': return item.data.planSummary;
        case 'meditation': return item.data.summary;
        case 'recipe': return item.data.description;
        default: return "";
    }
}


export default function PublicRecommendations() {
    const [recommendations, setRecommendations] = useState<RecommendationHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPublicRecommendations = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'recommendation-history'),
                    where('isPublic', '==', true),
                    orderBy('rating', 'desc'),
                    limit(6)
                );
                const querySnapshot = await getDocs(q);
                const items = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: (doc.data().timestamp as Timestamp).toDate()
                })) as RecommendationHistoryItem[];
                setRecommendations(items);
            } catch (error) {
                console.error("Error fetching public recommendations: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicRecommendations();
    }, []);

    return (
        <section id="public-recommendations" className="container py-24 sm:py-32">
            <div className="text-center space-y-4 mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold">Community Recommendations</h2>
                <p className="text-lg text-muted-foreground md:w-2/3 mx-auto">
                    Check out these popular and highly-rated wellness plans shared by our community.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : recommendations.length === 0 ? (
                <p className="text-center text-muted-foreground">No public recommendations available yet. Sign up to create and share your own!</p>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations.map(item => (
                        <Card key={item.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    {getIcon(item.type)}
                                    <div className="flex items-center gap-1">
                                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400"/>
                                        <span className="font-bold">{item.rating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                </div>
                                <CardTitle className="pt-4">{getTitle(item)}</CardTitle>
                                <CardDescription className="line-clamp-3">{getDescription(item)}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-end">
                                <div className="flex flex-wrap gap-2">
                                    {item.data.tags?.map((tag:string) => (
                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}
