<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
import * as React from 'react';

import { cn } from '../lib/utils';
=======
import * as React from "react"

import { cn } from "@/lib/utils"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
      'rounded-lg border bg-card text-card-foreground shadow-sm',
=======
      "rounded-lg border bg-card text-card-foreground shadow-sm",
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx
      className
    )}
    {...props}
  />
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
));
Card.displayName = 'Card';
=======
))
Card.displayName = "Card"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
));
CardHeader.displayName = 'CardHeader';
=======
))
CardHeader.displayName = "CardHeader"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
      'text-2xl font-semibold leading-none tracking-tight',
=======
      "text-2xl font-semibold leading-none tracking-tight",
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx
      className
    )}
    {...props}
  />
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
));
CardTitle.displayName = 'CardTitle';
=======
))
CardTitle.displayName = "CardTitle"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
));
CardDescription.displayName = 'CardDescription';
=======
))
CardDescription.displayName = "CardDescription"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';
=======
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
<<<<<<< HEAD:frontend/packages/components/ui/src/card.tsx
));
CardFooter.displayName = 'CardFooter';
=======
))
CardFooter.displayName = "CardFooter"
>>>>>>> 1dee3d647c7fc2b7c6a8892b23d856f318494c99:frontend/src/components/ui/card.tsx

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }