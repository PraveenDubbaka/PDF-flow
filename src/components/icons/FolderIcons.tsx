import React from 'react';

interface IconProps {
 className?: string;
 style?: React.CSSProperties;
}

/**
 * Folder icons based on the exact Font Awesome solid folder-open silhouette.
 * The plus / minus variants keep the same base shape and add a centered white
 * symbol so the style still matches the requested Font Awesome icon.
 */
function BaseFolder({
 className,
 style,
 symbol,
}: IconProps & { symbol: 'plus' | 'minus' | null }) {
 return (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 576 512"
 className={className}
 style={style}
 fill="currentColor"
 aria-hidden="true"
 >
 <path d="M88.7 223.8L0 375.8V96C0 60.7 28.7 32 64 32H181.5c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7H416c35.3 0 64 28.7 64 64v32H144c-22.8 0-43.8 12.1-55.3 31.8zm27.6 16.1C122.1 230 132.6 224 144 224H544c11.5 0 22 6.1 27.7 16.1s5.7 22.2-.1 32.1l-112 192C453.9 474 443.4 480 432 480H32c-11.5 0-22-6.1-27.7-16.1s-5.7-22.2.1-32.1l112-192z" />

 {symbol === 'plus' && (
 <g fill="#ffffff">
 <rect x="208" y="328" width="160" height="48" rx="14" />
 <rect x="264" y="272" width="48" height="160" rx="14" />
 </g>
 )}

 {symbol === 'minus' && (
 <rect x="208" y="328" width="160" height="48" rx="14" fill="#ffffff" />
 )}
 </svg>
 );
}

export function FolderSolidIcon(props: IconProps) {
 return <BaseFolder {...props} symbol={null} />;
}

export function FolderPlusIcon(props: IconProps) {
 return <BaseFolder {...props} symbol="plus" />;
}

export function FolderMinusIcon(props: IconProps) {
 return <BaseFolder {...props} symbol="minus" />;
}
