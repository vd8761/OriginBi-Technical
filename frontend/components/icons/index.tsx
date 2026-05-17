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

export const EyeVisibleIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"
      fill="currentColor"
    />
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

export const ArrowRightIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
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
export const DashboardIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.16663 0H1.16663C0.523315 0 0 0.523315 0 1.16663V4.16663C0 4.81006 0.523315 5.33337 1.16663 5.33337H6.16663C6.81006 5.33337 7.33337 4.81006 7.33337 4.16663V1.16663C7.33337 0.523315 6.81006 0 6.16663 0Z" />
    <path d="M6.16663 6.66663H1.16663C0.523315 6.66663 0 7.18994 0 7.83337V14.8334C0 15.4767 0.523315 16 1.16663 16H6.16663C6.81006 16 7.33337 15.4767 7.33337 14.8334V7.83337C7.33337 7.18994 6.81006 6.66663 6.16663 6.66663Z" />
    <path d="M14.8333 10.6666H9.83325C9.18982 10.6666 8.6665 11.1899 8.6665 11.8334V14.8334C8.6665 15.4767 9.18982 16 9.83325 16H14.8333C15.4766 16 15.9999 15.4767 15.9999 14.8334V11.8334C15.9999 11.1899 15.4766 10.6666 14.8333 10.6666Z" />
    <path d="M14.8333 0H9.83325C9.18982 0 8.6665 0.523316 8.6665 1.16663V8.16663C8.6665 8.81006 9.18982 9.33338 9.83325 9.33338H14.8333C15.4766 9.33338 15.9999 8.81006 15.9999 8.16663V1.16663C15.9999 0.523316 15.4766 0 14.8333 0Z" />
  </svg>
);

export const JobsIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 20 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.0004 3.60004C11.5588 3.60004 11.2004 3.24163 11.2004 2.80003V1.60002H8.00041V2.80003C8.00041 3.24163 7.642 3.60004 7.2004 3.60004C6.75879 3.60004 6.40039 3.24163 6.40039 2.80003V1.60002C6.40039 0.717607 7.118 0 8.00041 0H11.2004C12.0828 0 12.8005 0.717607 12.8005 1.60002V2.80003C12.8005 3.24163 12.4421 3.60004 12.0004 3.60004Z" />
    <path d="M10.1681 10.704C10.0241 10.76 9.8161 10.8 9.6001 10.8C9.3841 10.8 9.1761 10.76 8.98409 10.688L0 7.69592V13.8C0 15.016 0.98401 16 2.20002 16H17.0002C18.2162 16 19.2002 15.016 19.2002 13.8V7.69592L10.1681 10.704Z" />
    <path d="M19.2002 4.60005V6.43207L9.7921 9.5681C9.7281 9.5921 9.6641 9.6001 9.6001 9.6001C9.5361 9.6001 9.4721 9.5921 9.4081 9.5681L0 6.43207V4.60005C0 3.38403 0.98401 2.40002 2.20002 2.40002H17.0002C18.2162 2.40002 19.2002 3.38403 19.2002 4.60005Z" />
  </svg>
);

export const ProfileIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 14 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.88109 9.12768C7.91231 9.12768 8.86541 8.83706 9.62789 8.34331C10.2185 7.96518 10.9872 8.02768 11.506 8.49956C12.9465 9.8058 13.7653 11.6589 13.7621 13.6058V14.4402C13.7621 15.3027 13.0622 15.9995 12.1997 15.9995H1.56249C0.700016 15.9995 3.55214e-05 15.3027 3.55214e-05 14.4402V13.6058C-0.0062143 11.6621 0.812512 9.8058 2.2531 8.50268C2.77183 8.03081 3.54368 7.96831 4.13117 8.34643C4.89677 8.83706 5.84674 9.12768 6.88109 9.12768Z" />
    <path d="M6.88134 7.73749C9.01793 7.73749 10.75 6.00539 10.75 3.86874C10.75 1.7321 9.01793 0 6.88134 0C4.74474 0 3.0127 1.7321 3.0127 3.86874C3.0127 6.00539 4.74474 7.73749 6.88134 7.73749Z" />
  </svg>
);

export const SettingsIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 17 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15.8897 5.65281C15.5611 5.60507 15.2474 5.4838 14.9721 5.29803C14.6968 5.11225 14.4669 4.86677 14.2996 4.57984C14.1324 4.29292 14.032 3.97196 14.0059 3.64086C13.9799 3.30976 14.0289 2.97705 14.1492 2.66751C14.2258 2.46514 14.237 2.2439 14.1815 2.03481C14.1259 1.82571 14.0063 1.63924 13.8394 1.50155C13.1027 0.882892 12.2641 0.396895 11.3611 0.06522C11.1554 -0.0111684 10.9309 -0.0207126 10.7196 0.0379472C10.5082 0.0966069 10.3207 0.220478 10.1839 0.391914C9.97785 0.655327 9.71458 0.868372 9.41399 1.01489C9.1134 1.16141 8.78339 1.23756 8.44899 1.23756C8.1146 1.23756 7.78459 1.16141 7.484 1.01489C7.18341 0.868372 6.92014 0.655327 6.71414 0.391914C6.57728 0.220478 6.3898 0.0966069 6.17842 0.0379472C5.96705 -0.0207126 5.74255 -0.0111684 5.53691 0.06522C4.70309 0.371435 3.92349 0.808773 3.22752 1.36073C3.05209 1.49961 2.92573 1.69101 2.86694 1.9069C2.80816 2.12279 2.82003 2.35183 2.90083 2.56049C3.03081 2.87822 3.08451 3.22199 3.05763 3.56422C3.03075 3.90646 2.92403 4.23763 2.74604 4.53118C2.56806 4.82472 2.32375 5.07246 2.03272 5.25453C1.74169 5.4366 1.41204 5.54793 1.07022 5.57959C0.848295 5.60332 0.639854 5.69767 0.475584 5.84876C0.311313 5.99985 0.199893 6.19969 0.157727 6.41885C0.0528452 6.93802 1.21893e-05 7.46635 1.21893e-05 7.996C-0.000758693 8.43941 0.0350361 8.88214 0.107033 9.31967C0.142865 9.54586 0.252212 9.75395 0.418169 9.91176C0.584126 10.0696 0.797449 10.1683 1.02516 10.1927C1.37449 10.2255 1.71089 10.3415 2.0062 10.531C2.30151 10.7205 2.54713 10.9779 2.72252 11.2818C2.8979 11.5857 2.99794 11.9272 3.01427 12.2777C3.03059 12.6282 2.96272 12.9775 2.81634 13.2963C2.72054 13.5037 2.69678 13.7372 2.74883 13.9597C2.80087 14.1821 2.92574 14.3808 3.10361 14.5242C3.83591 15.1317 4.66643 15.6098 5.55944 15.938C5.67364 15.9776 5.79346 15.9985 5.9143 16C6.08 15.9996 6.24319 15.9596 6.3902 15.8831C6.53721 15.8067 6.66374 15.6961 6.7592 15.5607C6.95995 15.2682 7.22907 15.0291 7.54317 14.8642C7.85728 14.6993 8.20689 14.6135 8.56165 14.6144C8.90538 14.6148 9.24427 14.6955 9.55132 14.85C9.85837 15.0045 10.1251 15.2286 10.3303 15.5043C10.4668 15.6878 10.6601 15.821 10.8802 15.8831C11.1002 15.9453 11.3347 15.9329 11.547 15.8479C12.3635 15.5193 13.1237 15.0651 13.8 14.5017C13.9699 14.3613 14.0909 14.1705 14.1455 13.957C14.2002 13.7434 14.1857 13.518 14.1042 13.3132C13.9717 12.9996 13.9139 12.6594 13.9354 12.3197C13.957 11.9799 14.0572 11.6497 14.2281 11.3553C14.3991 11.0609 14.6362 10.8102 14.9206 10.6231C15.2051 10.436 15.5291 10.3176 15.8672 10.2772C16.0864 10.2469 16.2903 10.1476 16.4493 9.99366C16.6083 9.83973 16.7141 9.63918 16.7515 9.42106C16.842 8.95125 16.891 8.47439 16.898 7.996C16.8981 7.4914 16.8509 6.98789 16.7572 6.49208C16.7191 6.27877 16.6148 6.08287 16.4591 5.93221C16.3034 5.78155 16.1042 5.68379 15.8897 5.65281ZM11.2653 7.996C11.2653 8.55302 11.1001 9.09752 10.7907 9.56067C10.4812 10.0238 10.0414 10.3848 9.52676 10.5979C9.01214 10.8111 8.44587 10.8669 7.89956 10.7582C7.35324 10.6495 6.85142 10.3813 6.45755 9.98744C6.06368 9.59357 5.79545 9.09175 5.68678 8.54544C5.57811 7.99912 5.63389 7.43285 5.84705 6.91824C6.06021 6.40362 6.42118 5.96377 6.88433 5.65431C7.34747 5.34485 7.89198 5.17967 8.44899 5.17967C9.19593 5.17967 9.91227 5.47639 10.4404 6.00455C10.9686 6.53272 11.2653 7.24906 11.2653 7.996Z" />
  </svg>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M8.00002 14.6667H1.99999C1.63198 14.6667 1.33334 14.368 1.33334 14V2.00002C1.33334 1.63202 1.63202 1.33337 1.99999 1.33337H8.00002C8.36868 1.33337 8.66667 1.03538 8.66667 0.666715C8.66667 0.298053 8.36868 0 8.00002 0H1.99999C0.897325 0 0 0.897356 0 2.00002V14C0 15.1027 0.897325 16 1.99999 16H8.00002C8.36868 16 8.66667 15.702 8.66667 15.3333C8.66667 14.9647 8.36868 14.6667 8.00002 14.6667Z" />
    <path d="M15.8548 7.52534L11.8015 3.52533C11.5401 3.26666 11.1175 3.27002 10.8588 3.53201C10.6001 3.79401 10.6028 4.216 10.8655 4.47467L13.7622 7.33333H6.00015C5.63149 7.33333 5.3335 7.63132 5.3335 7.99998C5.3335 8.36864 5.63149 8.66666 6.00015 8.66666H13.7622L10.8655 11.5253C10.6028 11.784 10.6008 12.206 10.8588 12.468C10.9895 12.6 11.1615 12.6666 11.3335 12.6666C11.5028 12.6666 11.6721 12.6026 11.8015 12.4746L15.8548 8.47462C15.9815 8.3493 16.0535 8.17861 16.0535 7.99995C16.0535 7.82136 15.9822 7.65135 15.8548 7.52534Z" />
  </svg>
);

export const MenuIcon: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export const AptitudeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export const CommunicationIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const CodingIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

export const MNCIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export const RoleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export const NotificationIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 16 18"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14.7715 15.0851H0.734753C0.0452248 15.0851 -0.262893 14.22 0.270627 13.784L2.1543 12.2435V7.40523C2.1543 4.77114 3.97319 2.56141 6.42554 1.96629C6.42872 1.67928 6.43097 1.45152 6.43097 1.32206C6.43097 0.591946 7.02374 0 7.75304 0C8.48234 0 9.0751 0.592049 9.0751 1.32206C9.0751 1.45152 9.07746 1.67928 9.08054 1.96629C11.5328 2.56141 13.3518 4.77114 13.3518 7.40523V12.2435L15.2354 13.784C15.7691 14.22 15.4611 15.0851 14.7715 15.0851Z" />
    <path d="M9.33048 15.9972C9.56593 15.9972 9.74244 16.2166 9.68996 16.4461C9.48598 17.3369 8.68821 18 7.73515 18C6.78199 18 5.98606 17.3368 5.7827 16.4459C5.73032 16.2165 5.90683 15.9972 6.14217 15.9972H9.33048Z" />
  </svg>
);

export const NotificationWithDotIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.6145 14.8835H0.725024C0.0448578 14.8835 -0.259528 14.0301 0.267029 13.5995L2.1251 12.0804V7.30647C2.1251 4.70765 3.91966 2.52752 6.33979 1.94026C6.34231 1.6569 6.34484 1.43219 6.34484 1.30456C6.34484 0.584627 6.92945 0 7.64935 0C8.36926 0 8.95124 0.584627 8.95124 1.30456C8.95124 1.41176 8.95892 1.639 8.96651 1.94026C9.1452 1.98364 9.31883 2.03471 9.4873 2.096C9.26017 2.45086 9.08654 2.84142 8.97419 3.25757C8.87469 3.61496 8.82099 3.99277 8.82099 4.38333C8.82099 4.56203 8.8312 4.74072 8.85416 4.91436C8.91291 5.38916 9.05075 5.83848 9.25492 6.2521C9.93397 7.64848 11.3559 8.61356 13.0075 8.63904C13.0304 8.64157 13.0534 8.64157 13.0764 8.64157C13.1071 8.64157 13.1402 8.64157 13.1709 8.63904V12.0446L15.0725 13.5995C15.5991 14.0301 15.2947 14.8835 14.6145 14.8835Z"
      fill="currentColor"
    />
    <path
      d="M9.20556 16.024C9.43785 16.024 9.61199 16.2406 9.56021 16.467C9.35897 17.3458 8.57192 18 7.63166 18C6.69129 18 5.90606 17.3457 5.70543 16.4668C5.65375 16.2405 5.82789 16.024 6.06007 16.024H9.20556Z"
      fill="currentColor"
    />
    <path
      d="M13.6916 8.08551C15.7548 7.74658 17.1526 5.79921 16.8137 3.73593C16.4747 1.67266 14.5275 0.274798 12.4643 0.613728C10.4011 0.952659 9.00326 2.90003 9.34218 4.96331C9.6811 7.02658 11.6284 8.42444 13.6916 8.08551Z"
      fill="#1ED36A"
    />
  </svg>
);

export const RoadmapIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 22 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.3338 9.5531V12.4532C17.3338 13.5066 16.7137 14.4466 15.7537 14.8866C14.587 15.42 12.8203 16 10.6669 16C8.51348 16 6.74676 15.42 5.57338 14.8866C4.62002 14.4466 4 13.5066 4 12.4532V9.5531L8.74015 11.7198C9.34684 11.9998 10.0002 12.1399 10.6669 12.1399C11.3336 12.1399 11.9869 11.9998 12.5936 11.7198L17.3338 9.5531Z" />
    <path d="M20.0009 8.33313V12.6666C20.0009 13.0333 19.7008 13.3333 19.3342 13.3333C18.9675 13.3333 18.6675 13.0333 18.6675 12.6666V8.94648L20.0009 8.33313Z" />
    <path d="M9.2923 10.5092C9.72898 10.7085 10.1977 10.8085 10.667 10.8085C11.1364 10.8085 11.6044 10.7092 12.0417 10.5092L20.556 6.61705C21.036 6.39771 21.334 5.93303 21.334 5.40434C21.334 4.87566 21.036 4.41031 20.556 4.19097L12.0417 0.29951C11.1677 -0.0998366 10.167 -0.0998366 9.29297 0.29951L0.778025 4.1903C0.29801 4.41031 0 4.87499 0 5.40368C0 5.93236 0.29801 6.39704 0.778025 6.61705L9.2923 10.5092Z" />
  </svg>
);

export const VideosIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 15 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.71764 0.352787C1.21679 -0.474644 0 0.203197 0 1.86558V14.1332C0 15.7973 1.21679 16.4742 2.71764 15.6476L13.874 9.49828C15.3753 8.67055 15.3753 7.32952 13.874 6.50199L2.71764 0.352787Z" />
  </svg>
);

export const OriginDataIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 15 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15 16L0 0H15V16Z" fill="currentColor" />
  </svg>
);

export const MarkAllReadIcon: React.FC<{ className?: string }> = ({ className = "relative w-4 h-4" }) => (
  <div className={className}>
    <svg className="absolute inset-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    <svg className="absolute inset-0 w-4 h-4 -left-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);

export const NoNotificationsIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="165" height="200" viewBox="0 0 165 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M76.5936 200C88.0672 200 98.2076 194.456 104.629 185.965H48.5938C54.9797 194.456 65.1551 200 76.6287 200H76.5936Z" fill="#1ED36A" />
    <path d="M76.6289 1C85.7608 1 93.1729 8.41198 93.1729 17.5439C93.1728 21.8713 91.4556 25.8397 88.6738 28.7871L87.4678 30.0654L89.1816 30.4492C94.4366 31.6276 99.4251 33.4833 104.04 35.9307C97.2889 43.0414 93.1377 52.6215 93.1377 63.1582C93.1378 85.0087 110.884 102.755 132.734 102.755C133.588 102.755 134.42 102.718 135.243 102.661V144.035C135.243 147.229 137.115 150.178 139.991 151.536L139.994 151.538C146.215 154.448 150.532 160.267 151.57 167.063L151.699 167.913H151.732L152.199 171.014V171.015C152.44 172.762 151.931 174.51 150.784 175.873C149.642 177.196 147.989 177.198 146.243 177.948H7.01562C5.27217 177.948 3.62159 177.198 2.47949 175.879C1.32846 174.515 0.81625 172.764 1.05762 171.014L1.65332 167.063C2.69125 160.267 7.00818 154.448 13.2285 151.538L13.2314 151.536C16.1077 150.178 17.9805 147.229 17.9805 144.035V87.7197C17.9805 59.7098 37.782 36.2118 64.0713 30.4502L64.0713 30.4502C64.0713 30.4502 64.0713 30.4502 64.0713 30.4502ZM11.1428 5.14287C11.1428 4.67142 11.5286 4.2857 12 4.2857C12.4714 4.2857 12.8572 4.67142 12.8572 5.14287V11.5886L16.8215 14.76C17.19 15.0557 17.25 15.5957 16.9543 15.9643C16.7871 16.1743 16.5386 16.2857 16.2857 16.2857C16.0971 16.2857 15.9085 16.2257 15.75 16.0971L11.4643 12.6686C11.2629 12.5057 11.1429 12.2615 11.1429 12V5.14287H11.1428Z" stroke="currentColor" strokeWidth="2" />
  </svg>
);


export const EmailIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

export const PhoneIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15.5804 11.7424L13.3429 9.50953C12.5438 8.71208 11.1853 9.03109 10.8656 10.0677C10.6259 10.7855 9.82675 11.1842 9.10754 11.0247C7.50929 10.626 5.35166 8.5526 4.95209 6.87796C4.71236 6.16023 5.19183 5.36278 5.91104 5.12358C6.9499 4.8046 7.26955 3.44895 6.47043 2.6515L4.23288 0.418658C3.59358 -0.139553 2.63464 -0.139553 2.07525 0.418658L0.556915 1.9338C-0.96142 3.52869 0.71674 7.75515 4.47262 11.5031C8.2285 15.2511 12.4639 17.0055 14.0621 15.4106L15.5804 13.8955C16.1399 13.2575 16.1399 12.3006 15.5804 11.7424Z"
      fill="currentColor"
    />
  </svg>
);

export const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

export const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

export const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
  </svg>
);

export const LockIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
      clipRule="evenodd"
    />
  </svg>
);

export const ArrowRightWithoutLineIcon: React.FC<{ className?: string }> = ({ className = "w-2 h-4" }) => (
  <svg width="8" height="15" viewBox="0 0 8 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M0.858619 13.974C0.662243 14.1708 0.343861 14.1708 0.147484 13.974C-0.0488759 13.7771 -0.0488759 13.458 0.147484 13.2612L6.33311 7.06091L0.147281 0.860465C-0.049095 0.663641 -0.0490951 0.344505 0.147281 0.147665C0.343658 -0.0491765 0.662041 -0.0491766 0.8584 0.147665L7.3525 6.65711C7.46243 6.7673 7.51082 6.91578 7.49769 7.0597C7.51152 7.20431 7.4632 7.35375 7.35272 7.4645L0.858619 13.974Z" fill="currentColor" />
  </svg>
);

export const XIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export const ReportTriangleIcon: React.FC<{ className?: string; fillColor?: string }> = ({ 
  className = "w-4 h-4", 
  fillColor = "currentColor" 
}) => (
  <svg 
    width="15" 
    height="16" 
    viewBox="0 0 15 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-hidden="true"
  >
    <path d="M15 16L0 0H15V16Z" fill={fillColor} />
  </svg>
);

export const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.066-.926-2.066-2.065 0-1.142.922-2.067 2.066-2.067 1.141 0 2.065.925 2.065 2.067 0 1.139-.924 2.065-2.065 2.065zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// New icons for Header component
export const AssessmentNewIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

export const CounsellorIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export const DebriefIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

export const ExploreIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z" />
  </svg>
);
