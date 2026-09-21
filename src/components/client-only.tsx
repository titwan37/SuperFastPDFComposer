
"use client";

import { useState, useEffect, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that ensures its children are only rendered on the client side.
 * This is useful for preventing hydration mismatches with components that
 * rely on browser-specific APIs like `window` or `localStorage`.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
