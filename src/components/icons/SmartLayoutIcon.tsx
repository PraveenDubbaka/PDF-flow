import React from 'react';

interface SmartLayoutIconProps {
 className?: string;
}

export function SmartLayoutIcon({ className }: SmartLayoutIconProps) {
 return (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 className={className}
 fill="currentColor"
 stroke="none"
 >
 {/* 2x2 grid squares */}
 <rect x="3" y="3" width="7" height="7" rx="1.5" />
 <rect x="3" y="14" width="7" height="7" rx="1.5" />
 <rect x="14" y="3" width="7" height="7" rx="1.5" />
 {/* Plus icon in bottom-right */}
 <rect x="15.5" y="17" width="4" height="1.2" rx="0.6" />
 <rect x="16.9" y="15.5" width="1.2" height="4" rx="0.6" />
 </svg>
 );
}
