import React from 'react';

type IconProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  fill?: string;
  ariaHidden?: boolean;
};

// A centralized (placeholder) Solaris-like icon set.
// These are intentionally simple and use `currentColor`.
// We can swap the paths with official Solaris SVGs once available
// but centralizing makes replacements easy.

export const CheckIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 1000 1000" fill={fill} aria-hidden={ariaHidden}>
    <path d="M875 240a64.568 64.568 0 0 0-108.864-47.408l-.011-.012L383.621 565 257.594 424.648l-.011.014a64.37 64.37 0 0 0-87.784 3.375l-25.862 26a65.23 65.23 0 0 0-4.758 86.56l-.011.008 206.9 260 .01-.008a64.407 64.407 0 0 0 100.953 0l.011.009 413.793-520-.011-.008A64.9 64.9 0 0 0 875 240" style={{fillRule: 'evenodd'}} />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 1000 1000" fill={fill} aria-hidden={ariaHidden}>
    <path d="M500 75.5c-234.72 0-425 190.28-425 425s190.28 425 425 425 425-190.28 425-425-190.28-425-425-425m0 100a75 75 0 1 1-75 75 75 75 0 0 1 75-75m125 600H400v-25.737l5.287-.167c15.555-.5 27.115-4.919 34.368-13.136 2.576-2.972 6.956-13.1 6.956-47.153v-227.2c0-32.392-4.523-44.6-8.311-49.141-5.359-6.391-16.516-10.147-33.17-11.156l-5.13-.31v-26h175v313.807c0 32.415 8.457 44.618 12.24 49.142 5.34 6.389 15.68 10.142 32.625 11.152l5.135.3v25.6Z" style={{fillRule: 'evenodd'}} />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 1000 1000" fill={fill} aria-hidden={ariaHidden}>
    <path d="M499.352 125a93.95 93.95 0 0 1 81.072 46.494L908.91 733.919A93.676 93.676 0 0 1 827.838 874.9H170.867A93.711 93.711 0 0 1 89.8 733.919l.8-1.3v-.1l327.681-561.025A93.83 93.83 0 0 1 499.352 125"/>
    <path fill="#000" d="M500.352 679.926a47.494 47.494 0 1 0 47.484 47.494 47.53 47.53 0 0 0-47.484-47.494m0-379.949a47.53 47.53 0 0 0-47.483 47.493 28 28 0 0 0 .1 2.9l15.694 258.665v.5c.3 17.1 14.395 23.5 31.689 23.5 17.494 0 31.689-6.6 31.689-24l15.695-258.065.1-.9a23 23 0 0 0 .1-2.6 47.68 47.68 0 0 0-47.583-47.493"/>
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ className, width = 18, height = 18, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 1000 1000" fill={fill} aria-hidden={ariaHidden}>
    <path d="M500 75C265.279 75 75 265.279 75 500s190.279 425 425 425 425-190.279 425-425S734.721 75 500 75m222.051 264.988-254.642 320-.007-.006a39.635 39.635 0 0 1-62.125 0l-.006.005-127.321-160 .006-.006a40.14 40.14 0 0 1 2.928-53.267l15.915-16a39.61 39.61 0 0 1 54.022-2.077l.006-.008L428.382 515 663.77 285.818l.006.008A39.734 39.734 0 0 1 730.77 315a39.95 39.95 0 0 1-8.726 24.981Z" style={{fillRule: 'evenodd'}} />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M11 1a2 2 0 0 1 2 2v3H3V3a2 2 0 0 1 2-2h6zM3 8h10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
  </svg>
);

export const UnlockIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
  </svg>
);

export const CrossIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 1000 1000" fill={fill} aria-hidden={ariaHidden}>
    <path d="M817.493 676.165a49.977 49.977 0 0 1 0 70.664l-70.664 70.664a49.977 49.977 0 0 1-70.664 0L499.5 640.828 322.835 817.493a49.977 49.977 0 0 1-70.664 0l-70.664-70.664a49.977 49.977 0 0 1 0-70.664L358.172 499.5 181.507 322.835a49.977 49.977 0 0 1 0-70.664l70.664-70.664a49.977 49.977 0 0 1 70.664 0L499.5 358.172l176.665-176.665a49.977 49.977 0 0 1 70.664 0l70.664 70.664a49.977 49.977 0 0 1 0 70.664L640.828 499.5Z" style={{fillRule: 'evenodd'}} />
  </svg>
);

export const BatteryIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M2 6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zm10.5-1a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.5.5H13v-3h-.5z" />
  </svg>
);

export const BoxIcon: React.FC<IconProps> = ({ className, width = 20, height = 20, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 1000 1000" fill={fill} aria-hidden={ariaHidden}>
    <path d="M883.53 387.9H662V273.033C662 185.015 590.5 113 502.5 113S343 185.015 343 273.033V387.9H115a50.016 50.016 0 0 0-42.88 75.736L265 888h465l196.41-424.367c4.52-7.512 8.59-16.314 8.59-25.726 0-27.615-23.85-50.007-51.47-50.007M165 487.918h175l19.23 125.025H223.95Zm150 325.066-60-125.025h115.77L390 812.984zm225 0h-80l-20-125.025h120Zm30-200.041H435l-20-125.025h170ZM586.99 387.9H418.05l-.13-114.864a84.556 84.556 0 1 1 169.11 0ZM685 812.984h-75.31L630 687.959h115Zm91.05-200.041H639.3L655 487.918h175.17Z" style={{fillRule: 'evenodd'}} />
  </svg>
);

export const ShopIcon: React.FC<IconProps> = ({ className, width = 20, height = 20, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M2 2v2h12V2H2zm0 3v8a1 1 0 001 1h10a1 1 0 001-1V5H2zM4 7h2v4H4V7zm6 0h2v4H10V7z" />
  </svg>
);

export const PrintIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M2 4h12v4H2V4zm1-2h10v1H3V2zM4 10h8v3H4v-3z" />
  </svg>
);

export const TruckIcon: React.FC<IconProps> = ({ className, width = 20, height = 20, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M0 3a1 1 0 0 1 1-1h9.5a1 1 0 0 1 .8.4l2.2 3A1 1 0 0 1 14.5 6H15v4a1 1 0 0 1-1 1h-1a2 2 0 1 1-4 0H6a2 2 0 1 1-4 0H1a1 1 0 0 1-1-1V3z" />
  </svg>
);

export const HeartIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 24 24" fill={fill} aria-hidden={ariaHidden}>
    {/* Standard rounded heart path for consistent rendering */}
    <path d="M12.1 21.35l-1.1-1.02C5.14 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.14 6.86-8.9 11.83l-1 1.02z" style={{fillRule: 'nonzero'}} />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14s1-4 6-4 6 4 6 4-1 0-6 0-6 0-6 0z" />
  </svg>
);

export const UsersIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.003-.003.007-.007.01-.01l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.01-.01zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M8 16a2 2 0 002-2H6a2 2 0 002 2z" />
    <path d="M8 1a4 4 0 00-4 4v2.086c0 .36-.214.686-.542.826L2 9.5V11h12V9.5l-1.458-.588A1 1 0 0012 7.086V5a4 4 0 00-4-4z" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M4 1a1 1 0 011-1h6a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V1zm2 12a1 1 0 102 0 1 1 0 00-2 0z" />
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ className, width = 16, height = 16, fill = 'currentColor', ariaHidden = true }) => (
  <svg className={className} width={width} height={height} viewBox="0 0 16 16" fill={fill} aria-hidden={ariaHidden}>
    <path d="M8 0L1 3v5c0 5 7 8 7 8s7-3 7-8V3L8 0zm-.5 13.5c-3.5-1-5.5-4-5.5-6.5V4l5-2v11.5z" />
  </svg>
);

export default {
  CheckIcon,
  InfoIcon,
  CheckCircleIcon,
  LockIcon,
  UnlockIcon,
  CrossIcon,
  BatteryIcon,
  BoxIcon,
  ShopIcon,
  PrintIcon,
  TruckIcon,
  HeartIcon,
  UserIcon,
  UsersIcon,
  SearchIcon,
  BellIcon,
  PhoneIcon,
  ShieldIcon,
};
