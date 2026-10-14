import { useId } from "react";

/** The QLC diamond, drawn with a fixed silhouette and a shallow glass bevel. */
export function BrandCrystal({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 520 520" fill="none">
      <defs>
        <linearGradient id={`${id}-edge`} x1="95" y1="120" x2="386" y2="411" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f6ffe4" /><stop offset=".2" stopColor="#a0b59d" /><stop offset=".47" stopColor="#18231d" /><stop offset=".62" stopColor="#d9ffa7" /><stop offset=".78" stopColor="#3c613c" /><stop offset="1" stopColor="#ddffb8" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="140" y1="100" x2="366" y2="418" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eef3e9" stopOpacity=".72" /><stop offset=".27" stopColor="#b2c7ba" stopOpacity=".15" /><stop offset=".52" stopColor="#eef8e9" stopOpacity=".28" /><stop offset=".53" stopColor="#7f9b85" stopOpacity=".08" /><stop offset="1" stopColor="#caff86" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={`${id}-bevel`} x1="158" y1="139" x2="344" y2="394" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".9" /><stop offset=".37" stopColor="#b8d1bc" stopOpacity=".3" /><stop offset=".51" stopColor="#101910" stopOpacity=".6" /><stop offset=".78" stopColor="#f2ffe8" stopOpacity=".8" /><stop offset="1" stopColor="#b8ff35" stopOpacity=".4" />
        </linearGradient>
        <linearGradient id={`${id}-reflection`} x1="179" y1="112" x2="354" y2="309" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".5" /><stop offset=".55" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}><stop stopColor="#b8ff35" stopOpacity=".18" /><stop offset="1" stopColor="#b8ff35" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="260" cy="438" rx="182" ry="45" fill={`url(#${id}-shadow)`} />
      <path d="m260 67 174 170-20 31-173 180L66 278l20-30Z" fill="#17231b" stroke="#c3d4c7" strokeOpacity=".5" />
      <path d="m86 248 174 169-19 31L66 278Z" fill={`url(#${id}-edge)`} />
      <path d="m260 417 174-180-20 31-173 180Z" fill={`url(#${id}-edge)`} />
      <path d="m260 67 174 170-174 180L86 248Z" fill={`url(#${id}-face)`} stroke="#f0ffe9" strokeOpacity=".72" strokeWidth="1.5" />
      <path d="m260 79 162 158-162 168L98 248Z" stroke={`url(#${id}-bevel)`} strokeWidth="14" />
      <path d="m260 93 148 145-148 153-148-144Z" stroke="#edffe6" strokeOpacity=".3" />
      <path d="m260 94 145 144-54 55-192-101Z" fill={`url(#${id}-reflection)`} />
      <path d="m260 68 174 169M86 248l174 169" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="m262 426 158-164" stroke="#c4ff82" strokeOpacity=".7" strokeWidth="2" />
      <path d="m245 442 153-159" stroke="#d9ffc4" strokeOpacity=".35" />
      <g transform="translate(218 217) skewY(-3)" fill="#eaffdf" fillOpacity=".76">
        <path fillRule="evenodd" d="M0 0h77v77H0zm16 16v45h45V16z" />
        <path d="m48 47 39 38-12 12-38-39z" />
      </g>
      <path d="M171 208h9m-4.5-4.5v9M341 303h9m-4.5-4.5v9" stroke="#eaffdf" strokeOpacity=".5" />
    </svg>
  );
}
