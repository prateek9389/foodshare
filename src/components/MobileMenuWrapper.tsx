'use client';

import dynamic from 'next/dynamic';

// Dynamic import for MobileMenu to avoid hydration issues
const MobileMenu = dynamic(() => import('./MobileMenu'), {
  ssr: false,
});

export default function MobileMenuWrapper() {
  return <MobileMenu />;
}
