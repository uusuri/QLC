"use client";

import { useEffect, useRef, useState } from "react";

export function BrandAtom() {
  const [energized, setEnergized] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  const energize = () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setEnergized(false);
    window.requestAnimationFrame(() => setEnergized(true));
    resetTimer.current = window.setTimeout(() => setEnergized(false), 1100);
  };

  return (
    <button
      aria-label="Запустить импульс атома QLC"
      className={`qlc-atom relative mx-auto block aspect-square w-full max-w-[462px] cursor-pointer border-0 bg-transparent p-0 text-left ${
        energized ? "qlc-atom--energized" : ""
      }`}
      onClick={energize}
      type="button"
    >
      <div className="qlc-atom__halo" />
      <span aria-hidden="true" className="qlc-atom__core-flash" />
      <span aria-hidden="true" className="qlc-atom__pulse qlc-atom__pulse--one" />
      <span aria-hidden="true" className="qlc-atom__pulse qlc-atom__pulse--two" />
      <span aria-hidden="true" className="qlc-atom__marker qlc-atom__marker--one" />
      <span aria-hidden="true" className="qlc-atom__marker qlc-atom__marker--two" />
      <div className="qlc-atom__orbit qlc-atom__orbit--one">
        <span className="qlc-atom__satellite qlc-atom__satellite--one" />
      </div>
      <div className="qlc-atom__orbit qlc-atom__orbit--two">
        <span className="qlc-atom__satellite qlc-atom__satellite--two" />
      </div>
      <div className="qlc-atom__orbit qlc-atom__orbit--three">
        <span className="qlc-atom__satellite qlc-atom__satellite--three" />
      </div>
      <div className="qlc-atom__core">
        <span>QLC</span>
      </div>
      <span aria-hidden="true" className="qlc-atom__particle qlc-atom__particle--one" />
      <span aria-hidden="true" className="qlc-atom__particle qlc-atom__particle--two" />
      <span aria-hidden="true" className="qlc-atom__particle qlc-atom__particle--three" />
      <span aria-hidden="true" className="qlc-atom__particle qlc-atom__particle--four" />
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/38">
        теория · код · результат
      </p>
    </button>
  );
}
