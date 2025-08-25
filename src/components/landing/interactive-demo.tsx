'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';

export default function InteractiveDemo() {
  const [exercise, setExercise] = useState(5);
  const [diet, setDiet] = useState('balanced');
  const [meditation, setMeditation] = useState(true);

  return (
    <section id="demo" className="container py-24 sm:py-32">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl lg:text-4xl font-bold">See It in Action</h2>
        <p className="text-lg text-muted-foreground md:w-2/3 mx-auto">
          Experience a glimpse of our platform's potential. Adjust the settings in this interactive demo to see how we could tailor a wellness plan just for you.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>Wellness Plan Customizer</CardTitle>
          <CardDescription>Create your mock weekly wellness plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <Label htmlFor="exercise-slider" className="text-lg font-medium">Weekly Exercise: {exercise} hours</Label>
            <Slider
              id="exercise-slider"
              defaultValue={[exercise]}
              max={20}
              step={1}
              onValueChange={(value) => setExercise(value[0])}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-medium">Dietary Preference</Label>
            <RadioGroup defaultValue={diet} onValueChange={setDiet}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balanced" id="r1" />
                <Label htmlFor="r1">Balanced</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low-carb" id="r2" />
                <Label htmlFor="r2">Low-Carb</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vegetarian" id="r3" />
                <Label htmlFor="r3">Vegetarian</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="meditation-switch" className="text-lg font-medium">
              Daily Meditation Reminder
            </Label>
            <Switch
              id="meditation-switch"
              checked={meditation}
              onCheckedChange={setMeditation}
            />
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <p className="font-semibold">Your Mock Plan Summary:</p>
            <p className="text-sm text-muted-foreground">
              {exercise} hours of exercise, a {diet} diet, and {meditation ? 'daily meditation reminders' : 'no meditation reminders'}.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
