import React from 'react';

interface IconProps {
 className?: string;
}

export function AddItemAboveIcon({ className }: IconProps) {
 return (
 <svg 
 xmlns="http://www.w3.org/2000/svg" 
 viewBox="0 0 24 24" 
 className={className}
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 {/* Up arrow - bold and prominent */}
 <path d="M12 2L7 7h3v3h4V7h3L12 2z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
 {/* Document/item below with plus */}
 <rect x="5" y="12" width="14" height="9" rx="2" strokeWidth="2" />
 <line x1="12" y1="14.5" x2="12" y2="18.5" strokeWidth="2" />
 <line x1="10" y1="16.5" x2="14" y2="16.5" strokeWidth="2" />
 </svg>
 );
}

export function AddItemBelowIcon({ className }: IconProps) {
 return (
 <svg 
 xmlns="http://www.w3.org/2000/svg" 
 viewBox="0 0 24 24" 
 className={className}
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 {/* Document/item on top with plus */}
 <rect x="5" y="3" width="14" height="9" rx="2" strokeWidth="2" />
 <line x1="12" y1="5.5" x2="12" y2="9.5" strokeWidth="2" />
 <line x1="10" y1="7.5" x2="14" y2="7.5" strokeWidth="2" />
 {/* Down arrow - bold and prominent */}
 <path d="M12 22L7 17h3v-3h4v3h3L12 22z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
 </svg>
 );
}
