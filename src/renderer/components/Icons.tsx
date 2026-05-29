import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

const strokeIcon = (children: React.ReactNode, viewBox = '0 0 14 14') =>
  function Icon({ size = 14, ...props }: IconProps): React.ReactElement {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props['aria-label'] === undefined}
        {...props}
      >
        {children}
      </svg>
    );
  };

const fillIcon = (children: React.ReactNode, viewBox = '0 0 14 14') =>
  function Icon({ size = 14, ...props }: IconProps): React.ReactElement {
    return (
      <svg width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden={props['aria-label'] === undefined} {...props}>
        {children}
      </svg>
    );
  };

export const Ico = {
  Github: fillIcon(<path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />, '0 0 16 16'),
  Copilot: strokeIcon(<><path d="M2.5 9.5c0-1 .8-2 2-2 .8 0 1.3.4 1.7.9.4-.6 1-.9 1.8-.9s1.4.3 1.8.9c.4-.5.9-.9 1.7-.9 1.2 0 2 1 2 2v1.2c0 .5-.3.9-.8 1.1-1.4.5-2.9.7-4.7.7s-3.3-.2-4.7-.7c-.5-.2-.8-.6-.8-1.1V9.5z" /><path d="M8 7V4.5M5.5 4.5h5" /></>),
  Search: strokeIcon(<><circle cx="6" cy="6" r="4" /><path d="m9 9 3.5 3.5" /></>),
  Check: strokeIcon(<path d="m3 7 3 3 5-6" />),
  X: strokeIcon(<path d="m3 3 8 8M11 3l-8 8" />),
  Plus: strokeIcon(<path d="M7 2v10M2 7h10" />),
  Edit: strokeIcon(<path d="M2 12h10M9.5 2.5l2 2L5 11H3v-2z" />),
  Eye: strokeIcon(<><path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" /><circle cx="7" cy="7" r="1.8" /></>),
  Pop: strokeIcon(<path d="M6 2H2v10h10V8M8 2h4v4M12 2 7 7" />),
  Left: strokeIcon(<path d="m9 3-4 4 4 4" />),
  Right: strokeIcon(<path d="m5 3 4 4-4 4" />),
  Up: strokeIcon(<path d="m3 9 4-4 4 4" />),
  Down: strokeIcon(<path d="m3 5 4 4 4-4" />),
  Send: strokeIcon(<path d="M12.5 1.5 6 8M12.5 1.5 8 12.5 6 8 1.5 6z" />),
  Play: fillIcon(<path d="M4 2.5v9l7-4.5z" />),
  Bug: strokeIcon(<><rect x="4" y="4" width="6" height="8" rx="3" /><path d="M3 6H1M3 9H1M11 6h2M11 9h2M5 3l1 1M9 3 8 4" /></>),
  Spark: strokeIcon(<path d="M5 1v3M3.5 2.5h3M5 8v5M3 10.5h4M11 4v6M9 7h4" />),
  Sparkles: strokeIcon(<path d="M5 1v3M3.5 2.5h3M5 8v5M3 10.5h4M11 4v6M9 7h4" />),
  File: strokeIcon(<><path d="M3 1.5h5l3 3V12a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 3 12V2a.5.5 0 0 1 .5-.5z" /><path d="M8 1.5v3h3" /></>),
  Folder: strokeIcon(<path d="M1.5 4V3a.5.5 0 0 1 .5-.5h3L6.5 4h5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V4z" />),
  Repo: strokeIcon(<path d="M1.5 4V3a.5.5 0 0 1 .5-.5h3L6.5 4h5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V4z" />),
  Atlassian: fillIcon(<><path d="M7.12 11.84a.55.55 0 0 0-.93.14L1.28 21.7a.57.57 0 0 0 .51.82h6.83a.55.55 0 0 0 .51-.31c1.47-3.04.58-7.65-2.01-10.37z" /><path d="M11.51 1.21a12.61 12.61 0 0 0-.73 12.45l3.3 6.61a.57.57 0 0 0 .51.31h6.83a.57.57 0 0 0 .51-.82S12.69 1.84 12.46 1.4a.52.52 0 0 0-.95-.19z" /></>, '0 0 24 24'),
  Jira: strokeIcon(<path d="M7 1v6a3 3 0 0 0 3 3h3M7 7v6a3 3 0 0 0-3-3H1" />),
  Cmd: strokeIcon(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><path d="M3.5 5.5h-1A1.5 1.5 0 1 1 4 4v1.5M10.5 5.5h1A1.5 1.5 0 1 0 10 4v1.5M3.5 8.5h-1A1.5 1.5 0 1 0 4 10V8.5M10.5 8.5h1A1.5 1.5 0 1 1 10 10V8.5" /></>),
  Command: strokeIcon(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><path d="M3.5 5.5h-1A1.5 1.5 0 1 1 4 4v1.5M10.5 5.5h1A1.5 1.5 0 1 0 10 4v1.5M3.5 8.5h-1A1.5 1.5 0 1 0 4 10V8.5M10.5 8.5h1A1.5 1.5 0 1 1 10 10V8.5" /></>),
  Refresh: strokeIcon(<path d="M2 7a5 5 0 0 1 9-3l1-1v3H9M12 7a5 5 0 0 1-9 3l-1 1V8h3" />),
  Gear: strokeIcon(<><circle cx="12" cy="12" r="3" /><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /></>, '0 0 24 24'),
  Download: strokeIcon(<path d="M7 1.5V9M3.5 6 7 9.5 10.5 6M2 11.5v.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-.5" />),
  Info: strokeIcon(<><circle cx="7" cy="7" r="5.5" /><path d="M7 6v3.5M7 4.2v.3" /></>),
  Branch: strokeIcon(<><circle cx="3.5" cy="3" r="1.3" /><circle cx="3.5" cy="11" r="1.3" /><circle cx="10.5" cy="5" r="1.3" /><path d="M3.5 4.3v5.4M3.5 9c0-2.2 1.8-4 4-4H10" /></>),
  Mail: strokeIcon(<><rect x="1.5" y="3" width="13" height="10" rx="1.5" /><path d="m2 4 6 5 6-5" /></>, '0 0 16 16'),
  Clock: strokeIcon(<><circle cx="7" cy="7" r="5" /><path d="M7 4v3l2 1.5" /></>),
  Term: strokeIcon(<><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" /><path d="m4 5 2 2-2 2M7 9h3" /></>),
  Terminal: strokeIcon(<><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" /><path d="m4 5 2 2-2 2M7 9h3" /></>)
};
