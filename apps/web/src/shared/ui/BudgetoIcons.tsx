import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
}

function IconSvg({ children, size = 20 }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function SidebarCollapseIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M15 5 8 12l7 7M20 5l-7 7 7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function SidebarExpandIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="m9 5 7 7-7 7M4 5l7 7-7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.75v2M12 19.25v2M21.25 12h-2M4.75 12h-2M18.54 5.46l-1.42 1.42M6.88 17.12l-1.42 1.42M18.54 18.54l-1.42-1.42M6.88 6.88 5.46 5.46"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M19.5 15.6A7.8 7.8 0 0 1 8.4 4.5 8.3 8.3 0 1 0 19.5 15.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect height="6" rx="1" stroke="currentColor" strokeWidth="1.8" width="6" x="4" y="4" />
      <rect height="6" rx="1" stroke="currentColor" strokeWidth="1.8" width="6" x="14" y="4" />
      <rect height="6" rx="1" stroke="currentColor" strokeWidth="1.8" width="6" x="4" y="14" />
      <rect height="6" rx="1" stroke="currentColor" strokeWidth="1.8" width="6" x="14" y="14" />
    </IconSvg>
  );
}

export function AccountsIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect height="14" rx="2" stroke="currentColor" strokeWidth="1.8" width="17" x="3.5" y="5" />
      <path d="M3.5 9h17M7 14h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconSvg>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M5 6h14M5 12h14M5 18h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="3.5" cy="6" fill="currentColor" r=".8" />
      <circle cx="3.5" cy="12" fill="currentColor" r=".8" />
      <circle cx="3.5" cy="18" fill="currentColor" r=".8" />
    </IconSvg>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M12 3v11M8 10l4 4 4-4M5 20h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function VaultIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M6 4.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9v6M9 12h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconSvg>
  );
}

export function SecurityIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M12 3.5 19 6v5.2c0 4.3-2.8 7.7-7 9.3-4.2-1.6-7-5-7-9.3V6l7-2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconSvg>
  );
}

export function LanguageIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5s-1.1 6.2-3.2 8.5c-2.1-2.3-3.2-5.1-3.2-8.5S9.9 5.8 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </IconSvg>
  );
}
