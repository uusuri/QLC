"use client";

// ReactNode описывает label вкладки, если потом понадобится не только строка.
import type { ReactNode } from "react";

// Одна вкладка в tabbar.
export type TabItem<TValue extends string> = {
  // disabled блокирует вкладку.
  disabled?: boolean;
  // label — видимый текст.
  label: ReactNode;
  // value — стабильный ключ.
  value: TValue;
};

// Props tabbar.
type TabsProps<TValue extends string> = {
  // activeValue — текущая выбранная вкладка.
  activeValue: TValue;
  // className для внешнего layout.
  className?: string;
  // items — набор вкладок.
  items: Array<TabItem<TValue>>;
  // onChange вызывается при клике по доступной вкладке.
  onChange: (value: TValue) => void;
};

// Склеивает классы без внешней зависимости.
function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

// Tabs — общий рубленый tabbar для внутренних инструментов.
export function Tabs<TValue extends string>({
  activeValue,
  className,
  items,
  onChange
}: TabsProps<TValue>) {
  return (
    <div className={cn("grid gap-px border border-line bg-line sm:grid-cols-4", className)}>
      {items.map((item) => {
        const isActive = item.value === activeValue;

        return (
          <button
            className={cn(
              "min-h-12 px-4 text-left text-xs font-black uppercase tracking-[0.18em] transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-acid",
              isActive
                ? "bg-acid text-ink shadow-[0_0_24px_rgba(184,255,53,0.18)]"
                : "bg-panel text-white/70 hover:bg-white/8 hover:text-acid",
              item.disabled && "cursor-not-allowed bg-ink text-white/28 hover:text-white/28"
            )}
            disabled={item.disabled}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
