import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    />
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </IconBase>
  );
}

export function Clock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function MapPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

export function Car(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 11 1.5-4.5h11L19 11M4 11h16l1 3v4h-2v-2H5v2H3v-4l1-3Z" />
      <path d="M7 13h.01M17 13h.01" />
    </IconBase>
  );
}

export function Utensils(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3m-3 7v11" />
      <path d="M16 3v18m0-18c3 2 4 5 4 9h-4" />
    </IconBase>
  );
}

export function Coffee(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M17 10h1a3 3 0 0 1 0 6h-2M7 3v2m4-2v2" />
    </IconBase>
  );
}

export function Link(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 19.2l1.7-1.7" />
    </IconBase>
  );
}

export function Copy(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="13" rx="2" width="13" x="8" y="8" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </IconBase>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.3 4.8 2.7 18a1.8 1.8 0 0 0 1.6 2.7h15.4a1.8 1.8 0 0 0 1.6-2.7L13.7 4.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 3h.01" />
    </IconBase>
  );
}

export function RefreshCw(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.6 9A7 7 0 0 1 17.5 6L20 12M4 12l2.5 6A7 7 0 0 0 18.4 15" />
    </IconBase>
  );
}

export function Sliders(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4" />
    </IconBase>
  );
}

export function Menu(props: IconProps) {
  return (
    <IconBase {...props} className={`h-5 w-5 ${props.className ?? ''}`}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}
