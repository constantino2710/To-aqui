import * as React from 'react';
import { View, type ViewProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('rounded-lg border border-border bg-card shadow-lg shadow-primary/10', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('gap-2 p-5', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text role="heading" className={cn('text-xl font-semibold text-card-foreground', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-base text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('p-5 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn('gap-3 p-5 pt-0', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
