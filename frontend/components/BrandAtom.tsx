export function BrandAtom() {
  return (
    <div
      aria-label="QLC — обучение через практику"
      className="qlc-atom relative mx-auto aspect-square w-full max-w-[462px]"
      role="img"
    >
      <div className="qlc-atom__halo" />
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
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/38">
        теория · код · результат
      </p>
    </div>
  );
}
