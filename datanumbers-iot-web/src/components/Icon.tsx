import type { ReactNode, SVGProps } from "react";

/**
 * Conjunto de ícones inline (estilo Lucide). Mantemos em SVG cru —
 * sem dependência de pacote externo. Para adicionar um ícone, só
 * incluir o paths abaixo. Tudo herda `currentColor`, então a cor
 * vem do `text-*` do Tailwind no elemento pai.
 */

type IconName =
  | "home"
  | "cpu"
  | "layers"
  | "map"
  | "zap"
  | "activity"
  | "settings"
  | "user"
  | "plus"
  | "search"
  | "bell"
  | "chevronRight"
  | "chevronDown"
  | "chevronLeft"
  | "arrowRight"
  | "arrowDown"
  | "check"
  | "checkCircle"
  | "x"
  | "moreH"
  | "edit"
  | "trash"
  | "copy"
  | "play"
  | "pause"
  | "moon"
  | "sun"
  | "grid"
  | "list"
  | "filter"
  | "download"
  | "upload"
  | "wifi"
  | "wifiOff"
  | "radio"
  | "thermometer"
  | "droplet"
  | "gauge"
  | "bolt"
  | "folder"
  | "box"
  | "terminal"
  | "book"
  | "sliders"
  | "code"
  | "eye"
  | "alert"
  | "info"
  | "flag"
  | "arrowUpRight"
  | "rocket"
  | "target"
  | "workflow"
  | "spaces"
  | "lightbulb"
  | "fan"
  | "clock"
  | "refresh"
  | "logout";

const PATHS: Record<IconName, ReactNode> = {
  home: (<><path d="M3 12L12 4l9 8" /><path d="M5 10v10h14V10" /></>),
  cpu: (<><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>),
  layers: (<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 18l9 5 9-5" /></>),
  map: (<><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>),
  zap: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
  bell: (<><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2z" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  check: <path d="M5 12l5 5 9-12" />,
  checkCircle: (<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  moreH: (<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" /></>),
  trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />,
  copy: (<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  play: <path d="M6 4l14 8-14 8V4z" />,
  pause: (<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  filter: <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  wifi: (<><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="20" r="0.5" /></>),
  wifiOff: <path d="M2 2l20 20M9 17l3-3 3 3M5 12.5a10 10 0 0 1 5-2.7M19 12.5a10 10 0 0 0-3-2.4M2 9a15 15 0 0 1 5-3.5" />,
  radio: (<><circle cx="12" cy="12" r="2" /><path d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0" /></>),
  thermometer: <path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0z" />,
  droplet: <path d="M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3z" />,
  gauge: (<><path d="M12 14l4-4" /><circle cx="12" cy="14" r="9" /><path d="M3 14a9 9 0 0 1 18 0" /></>),
  bolt: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />,
  box: (<><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v9" /></>),
  terminal: (<><path d="M4 17l5-5-5-5M12 19h8" /><rect x="2" y="3" width="20" height="18" rx="2" /></>),
  book: (<><path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4z" /><path d="M19 17H6a2 2 0 0 0-2 2" /></>),
  sliders: <path d="M4 21V14M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  eye: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  alert: (<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>),
  flag: <path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5" />,
  arrowUpRight: <path d="M7 17L17 7M7 7h10v10" />,
  rocket: (<><path d="M5 13a8 8 0 0 1 8-8 8 8 0 0 1 6 14l-2 2-3-1-3 3-3-3 3-3-1-3 2-2-1-1-6 6z" /><circle cx="9" cy="15" r="1" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  workflow: (<><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="9" y="15" width="6" height="6" rx="1" /><path d="M6 9v3a2 2 0 0 0 2 2h2M18 9v3a2 2 0 0 1-2 2h-2" /></>),
  spaces: (<><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><path d="M9 6h6M6 9v6M18 9v6M9 18h6" /></>),
  lightbulb: <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2z" />,
  fan: (<><path d="M12 12c-2-3 0-7 0-7s4 4 0 7zM12 12c3-2 7 0 7 0s-4 4-7 0zM12 12c2 3 0 7 0 7s-4-4 0-7zM12 12c-3 2-7 0-7 0s4-4 7 0z" /><circle cx="12" cy="12" r="1.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  refresh: <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
