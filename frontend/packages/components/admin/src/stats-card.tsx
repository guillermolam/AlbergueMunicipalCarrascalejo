import React from 'react';
import { Card } from '@ui/card';
import { Label } from '@ui/label';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  className = ''
}) => {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-muted rounded-lg">{icon}</div>
        <div>
          <Label className="text-muted-foreground">{title}</Label>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
};
