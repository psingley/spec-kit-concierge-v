import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const icon = (path: string) =>
  function Icon(props: IconProps): React.ReactElement {
    return (
      <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden={props['aria-label'] === undefined} {...props}>
        <path fill="currentColor" d={path} />
      </svg>
    );
  };

export const Ico = {
  Spark: icon('M12 2l2.4 6.2L21 10.5l-6.1 2.8L12 20l-2.9-6.7L3 10.5l6.6-2.3L12 2z'),
  Gear: icon('M12 8a4 4 0 100 8 4 4 0 000-8z'),
  Repo: icon('M4 4h16v16H4z')
};
