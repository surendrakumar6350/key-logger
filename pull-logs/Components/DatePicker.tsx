"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface DatePickerProps {
  onDateChange: (date: string) => void;
  currentDate: string;
  isS3Source: boolean;
}

export default function DatePicker({ onDateChange, currentDate, isS3Source }: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate || '');
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Keep internal state in sync when parent changes the date
  useEffect(() => {
    if (currentDate && currentDate !== selectedDate) {
      setSelectedDate(currentDate);
    }
    if (!currentDate && selectedDate) {
      setSelectedDate('');
    }
  }, [currentDate]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDateChange(selectedDate);
  };
  
  const handleReset = () => {
    setSelectedDate(today);
    onDateChange(today);
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="date-picker" className="mb-2 block text-sm">
              Select Date
            </Label>
            <Input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedDate(v);
                onDateChange(v);
              }}
              max={today}
              className="w-full"
            />
            {isS3Source && (
              <p className="text-xs text-muted-foreground mt-1">
                Showing archived logs from S3 storage
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="default">
              View Logs
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleReset}>
              Today
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}