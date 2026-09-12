import { KitIcon } from "@/components/DesignKit";
export function BrandMark({ className = "" }: { className?: string }) {
  return <KitIcon name="diamond" className={`kit-brand-mark ${className}`} />;
}
