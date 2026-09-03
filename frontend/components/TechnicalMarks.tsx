import { cn } from "@/utils/cn";

type MarkProps = {
  className?: string;
};

type TechBarcodeProps = MarkProps & {
  label?: string;
};

export function TechBarcode({ className, label = "QLC-270/01" }: TechBarcodeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("qlc-tech-barcode pointer-events-none inline-flex select-none", className)}
    >
      <span className="qlc-tech-barcode__bars" />
      <span className="qlc-tech-barcode__label">{label}</span>
    </span>
  );
}

export function TechCrosshair({ className }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("qlc-tech-crosshair pointer-events-none block select-none", className)}
    />
  );
}

export function TechDotMatrix({ className }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("qlc-tech-dots pointer-events-none absolute block select-none", className)}
    />
  );
}

export function TechRuler({ className }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("qlc-tech-ruler pointer-events-none block select-none", className)}
    />
  );
}

export function TechStripes({ className }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("qlc-tech-stripes pointer-events-none block select-none", className)}
    />
  );
}
