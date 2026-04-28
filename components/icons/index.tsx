import React from "react";

export const DarkModeIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10.3571 20C14.6057 19.9972 18.4057 17.4921 19.9688 13.7077C20.0556 13.4976 19.9546 13.4182 19.7468 13.5226C18.5578 14.1201 17.2352 14.4338 15.8905 14.4343C11.2739 14.4346 7.53121 10.8215 7.5315 6.36459C7.53279 4.02017 8.58973 1.79946 10.4142 0.272455C10.6316 0.0694218 10.5691 -0.0244318 10.1406 0.00543258C4.70319 0.0415507 -1.42499e-05 4.47962 0 10.0017C1.85249e-05 15.5237 4.63708 20.0003 10.3571 20Z" />
  </svg>
);

export const LightModeIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 18 18"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9.00007 4.49158C6.51411 4.49158 4.4917 6.51438 4.4917 9.00035C4.4917 11.4863 6.51411 13.5091 9.00007 13.5091C11.4856 13.5091 13.5084 11.4867 13.5084 9.00035C13.5084 6.51399 11.4856 4.49158 9.00007 4.49158Z" />
    <path d="M8.99979 3.16634C8.51392 3.16634 8.12012 2.77254 8.12012 2.28707V0.879672C8.12012 0.3938 8.51392 0 8.99979 0C9.48566 0 9.87946 0.3938 9.87946 0.879672V2.28707C9.87946 2.77254 9.48526 3.16634 8.99979 3.16634Z" />
    <path d="M8.99979 14.8333C8.51392 14.8333 8.12012 15.2271 8.12012 15.7129V17.1199C8.12012 17.6062 8.51392 18 8.99979 18C9.48566 18 9.87946 17.6062 9.87946 17.1199V15.7129C9.87946 15.2271 9.48526 14.8333 8.99979 14.8333Z" />
    <path d="M13.1246 4.87504C12.7814 4.53146 12.7814 3.97464 13.1246 3.63106L14.1198 2.6358C14.463 2.29262 15.0202 2.29262 15.3638 2.6358C15.7074 2.97938 15.7074 3.5366 15.3638 3.87978L14.3685 4.87504C14.0254 5.21862 13.4685 5.21862 13.1246 4.87504Z" />
    <path d="M4.87519 13.1253C4.53161 12.7813 3.97479 12.7813 3.63121 13.1253L2.63595 14.1202C2.29277 14.4633 2.29237 15.021 2.63595 15.3641C2.97953 15.7073 3.53675 15.7073 3.87993 15.3641L4.87519 14.3685C5.21877 14.0253 5.21877 13.4681 4.87519 13.1253Z" />
    <path d="M14.8335 9.00003C14.8335 8.51416 15.2273 8.12036 15.7132 8.12036H17.1206C17.6064 8.12036 18.0002 8.51416 18.0002 9.00003C18.0002 9.48591 17.6064 9.87931 17.1206 9.87931H15.7132C15.2273 9.87931 14.8335 9.48591 14.8335 9.00003Z" />
    <path d="M3.16634 9.00003C3.16634 8.51416 2.77254 8.12036 2.28667 8.12036H0.879672C0.3938 8.12036 0 8.51416 0 9.00003C0 9.48591 0.3938 9.87931 0.879672 9.87931H2.28707C2.77254 9.87931 3.16634 9.48591 3.16634 9.00003Z" />
    <path d="M13.1244 13.1253C13.468 12.7821 14.0252 12.7821 14.3684 13.1253L15.3636 14.1206C15.7072 14.4633 15.7072 15.021 15.3636 15.3641C15.02 15.7073 14.4632 15.7073 14.1196 15.3641L13.1244 14.3689C12.7808 14.0253 12.7808 13.4685 13.1244 13.1253Z" />
    <path d="M4.87485 4.87506C5.21843 4.53149 5.21843 3.97466 4.87485 3.63109L3.87959 2.63622C3.53601 2.29265 2.97919 2.29265 2.63561 2.63622C2.29204 2.9794 2.29204 3.53662 2.63561 3.8798L3.63087 4.87506C3.97445 5.21904 4.53127 5.21904 4.87485 4.87506Z" />
  </svg>
);

export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 3l18 18" />
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const QuoteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M15.3212 9.28232C14.8262 9.23295 13.7372 9.23295 13.7372 8.53982C13.7372 7.59951 15.1231 6.36201 17.3506 5.02545C18.0434 4.57982 19.4794 3.88701 19.4794 2.94638C19.4794 2.20388 18.9347 1.65951 17.7962 1.80795C16.7072 1.95638 15.024 2.69888 12.7969 4.57982C10.4703 6.51045 8.29248 9.72795 8.29248 12.8958C8.29248 16.1133 10.4703 19.3308 13.985 19.3308C16.8062 19.3308 19.2319 17.2023 19.2319 14.2817C19.2315 12.0542 17.6972 9.48045 15.3212 9.28232Z"
      fill="currentColor"
    />
    <path
      d="M8.36281 7.89044C7.95625 7.67794 7.51031 7.53887 7.02906 7.49887C6.53406 7.4495 5.445 7.4495 5.445 6.75637C5.445 5.81606 6.83094 4.57856 9.05844 3.242C9.75156 2.79637 11.1869 2.10356 11.1869 1.16294C11.1869 0.420436 10.6422 -0.123939 9.50375 0.0244984C8.41469 0.172936 6.73156 0.915436 4.50437 2.79637C2.17812 4.727 0 7.9445 0 11.1126C0 14.3301 2.17781 17.5476 5.6925 17.5476C6.51875 17.5476 7.31063 17.3639 8.01781 17.0323C7.32437 15.7786 6.95469 14.3279 6.95469 12.8961C6.955 11.1279 7.52437 9.41325 8.36281 7.89044Z"
      fill="currentColor"
    />
  </svg>
);

export const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const BrainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
  </svg>
);

export const CodeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);

export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

export const MessageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

export const PuzzleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19.439 14.607a2 2 0 0 0 .393 2.734L21 18.5a2 2 0 0 1-3 3l-1.159-1.168a2 2 0 0 0-2.734-.393A2.435 2.435 0 0 1 12 18a2.435 2.435 0 0 1-2.107 1.939 2 2 0 0 0-.393 2.734L10.668 24a2 2 0 0 1-3-3l1.168-1.159a2 2 0 0 0 .393-2.734A2.435 2.435 0 0 1 7.293 12a2.435 2.435 0 0 1 1.939-2.107 2 2 0 0 0 2.734-.393L13.136 8.332a2 2 0 0 1 3 3l-1.168 1.159a2 2 0 0 0-.393 2.734A2.435 2.435 0 0 1 16.707 18a2.435 2.435 0 0 1-2.107-1.939 2 2 0 0 0-.393-2.734L13.132 12.168a2 2 0 0 1 3-3l1.168 1.159a2 2 0 0 0 .393 2.734A2.435 2.435 0 0 1 19.439 14.607Z"/>
  </svg>
);
