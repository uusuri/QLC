type SignalArtworkProps = {
  variant?: 'hero' | 'code' | 'orbit' | 'grid';
  className?: string;
};

const ink = '#101112';
const lime = '#c4ff00';
const paper = '#f0f0e8';

function RegistrationMarks({ color = ink }: { color?: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1" opacity=".65">
      <path d="M24 40h32M40 24v32M584 40h32M600 24v32M24 520h32M40 504v32M584 520h32M600 504v32" />
      <path d="M312 24h16M320 16v16M312 536h16M320 528v16M16 272h16M24 264v16M608 272h16M616 264v16" />
    </g>
  );
}

function StripePatch({ x, y, color = ink }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={color}>
      {Array.from({ length: 7 }, (_, index) => (
        <path key={index} d={`M${index * 10} 20l12-20h5l-12 20z`} />
      ))}
    </g>
  );
}

function DotMatrix({ x, y, columns = 8, rows = 4, color = ink }: {
  x: number;
  y: number;
  columns?: number;
  rows?: number;
  color?: string;
}) {
  return (
    <g fill={color}>
      {Array.from({ length: columns * rows }, (_, index) => (
        <circle key={index} cx={x + (index % columns) * 10} cy={y + Math.floor(index / columns) * 10} r="1.5" />
      ))}
    </g>
  );
}

function HeroSignal() {
  return (
    <>
      <rect width="640" height="560" fill={lime} />
      <RegistrationMarks />
      <g fill="none" stroke={ink} className="signal-artwork__rings">
        <circle cx="330" cy="276" r="221" strokeWidth="1" strokeDasharray="560 48 268 72" transform="rotate(-28 330 276)" opacity=".5" />
        <circle cx="330" cy="276" r="213" strokeWidth="1" strokeDasharray="3 8" opacity=".6" />
        <circle cx="330" cy="276" r="185" strokeWidth="46" strokeDasharray="285 22 102 56 510 188" transform="rotate(-90 330 276)" />
        <circle cx="330" cy="276" r="148" strokeWidth="2" strokeDasharray="400 40 160 330" transform="rotate(20 330 276)" />
        <circle cx="330" cy="276" r="135" strokeWidth="15" strokeDasharray="138 36 296 379" transform="rotate(-80 330 276)" />
        <circle cx="330" cy="276" r="118" strokeWidth="1" strokeDasharray="2 5" />
      </g>
      <g fill={ink} className="signal-artwork__core">
        <path d="M299 181h62v126h-62zM252 229h157v35H252z" />
        <path d="M350 308h43l112 118v45h-42L350 352z" />
        <path d="M277 289h-55v40h55zM286 338h-36v17h36z" />
      </g>
      <path d="M365 325l112 119" fill="none" stroke={lime} strokeWidth="6" />
      <g className="signal-artwork__bars" fill={ink}>
        <path d="M60 161h52v8H60zM60 179h33v5H60zM60 191h33v5H60zM60 203h33v5H60z" />
        <path d="M526 280h69v3h-69zM548 288h47v3h-47zM548 296h47v3h-47zM548 304h28v3h-28z" />
        <path d="M80 396h20v20H80zM100 416h20v20h-20zM80 436h20v20H80zM100 456h20v20h-20z" />
      </g>
      <StripePatch x={485} y={83} />
      <DotMatrix x={174} y={473} columns={8} rows={3} />
      <path d="M160 78h64M192 70v16M553 375v58h-24M139 293h49M164 269v49" fill="none" stroke={ink} strokeWidth="1" opacity=".65" />
      <g fontFamily="monospace" fontSize="10" fill={ink}>
        <text x="60" y="82">01 / 28</text>
        <text x="515" y="490">+ 270</text>
      </g>
    </>
  );
}

function CodeSignal() {
  return (
    <>
      <rect width="640" height="560" fill="#3c32f5" />
      <RegistrationMarks color={paper} />
      <g fill="none" stroke={paper} strokeWidth="1" opacity=".2">
        <path d="M80 0v560M560 0v560M0 80h640M0 480h640" />
        <path d="M160 120h320v320H160z" />
      </g>
      <g fill={lime} className="signal-artwork__core">
        <path d="M135 152h102v38h-56v69h-34v44h34v69h56v38H135v-88h-36v-82h36z" />
        <path d="M505 152H403v38h56v69h34v44h-34v69h-56v38h102v-88h36v-82h-36z" />
        <path d="M336 170h43l-76 222h-43z" />
      </g>
      <g fill={paper} className="signal-artwork__bars">
        <path d="M280 106h80v8h-80zM280 120h32v4h-32zM319 120h41v4h-41z" />
        <path d="M280 450h14v14h-14zM302 450h14v14h-14zM324 450h14v14h-14zM346 450h14v14h-14z" />
      </g>
      <StripePatch x={65} y={461} color={lime} />
      <DotMatrix x={498} y={80} color={lime} columns={6} rows={4} />
    </>
  );
}

function OrbitSignal() {
  return (
    <>
      <rect width="640" height="560" fill="#ff6652" />
      <path d="M0 0h212v108H0zM520 432h120v128H520z" fill={paper} />
      <RegistrationMarks />
      <g className="signal-artwork__rings" fill="none" stroke={ink}>
        <ellipse cx="327" cy="289" rx="229" ry="173" strokeWidth="1" transform="rotate(-34 327 289)" />
        <ellipse cx="327" cy="289" rx="207" ry="146" strokeWidth="3" transform="rotate(-34 327 289)" />
        <ellipse cx="327" cy="289" rx="177" ry="117" strokeWidth="39" transform="rotate(-34 327 289)" />
        <ellipse cx="327" cy="289" rx="127" ry="74" strokeWidth="11" transform="rotate(-34 327 289)" />
      </g>
      <path d="M278 148h101v67H278z" fill="#ff6652" />
      <path d="M296 136h44v128h-44z" fill={ink} className="signal-artwork__core" />
      <circle cx="369" cy="350" r="27" fill={paper} />
      <path d="M359 350h20M369 340v20" stroke={ink} strokeWidth="2" />
      <path d="M87 370v54h68M493 128h60v53" fill="none" stroke={ink} strokeWidth="2" />
      <DotMatrix x={73} y={57} columns={10} rows={3} />
      <StripePatch x={470} y={465} />
      <path d="M229 483h151M229 491h63" stroke={ink} strokeWidth="3" />
    </>
  );
}

function GridSignal() {
  return (
    <>
      <rect width="640" height="560" fill={paper} />
      <RegistrationMarks />
      <g fill={ink} opacity=".26">
        {Array.from({ length: 240 }, (_, index) => (
          <circle key={index} cx={92 + (index % 20) * 24} cy={145 + Math.floor(index / 20) * 24} r="2" />
        ))}
      </g>
      <path d="M88 412h104v-96h104v-96h104v-96h144v320H88z" fill={ink} className="signal-artwork__core" />
      <path d="M400 124h144v120H400z" fill={lime} />
      <path d="M432 158h80v12h-80zM466 132h12v64h-12z" fill={ink} />
      <g fill={paper} className="signal-artwork__bars">
        <path d="M222 350h44v8h-44zM222 367h30v5h-30zM326 255h44v8h-44zM326 272h30v5h-30z" />
        <path d="M433 373h15v15h-15zM455 373h15v15h-15zM477 373h15v15h-15zM499 373h15v15h-15z" />
      </g>
      <path d="M88 470h456M88 462v16M192 462v16M296 462v16M400 462v16M544 462v16" stroke={ink} strokeWidth="1" />
      <StripePatch x={90} y={86} />
      <g fontFamily="monospace" fontSize="10" fill={ink}>
        <text x="183" y="494">01</text>
        <text x="287" y="494">02</text>
        <text x="391" y="494">03</text>
        <text x="527" y="494">04</text>
      </g>
    </>
  );
}

export default function SignalArtwork({ variant = 'hero', className = '' }: SignalArtworkProps) {
  return (
    <svg
      viewBox="0 0 640 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={`signal-artwork signal-artwork--${variant} ${className}`.trim()}
    >
      {variant === 'hero' && <HeroSignal />}
      {variant === 'code' && <CodeSignal />}
      {variant === 'orbit' && <OrbitSignal />}
      {variant === 'grid' && <GridSignal />}
    </svg>
  );
}
