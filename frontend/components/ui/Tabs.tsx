"use client";

// ReactNode описывает label вкладки, если потом понадобится не только строка.
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

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

// Tabs — общий рубленый tabbar для внутренних инструментов.
export function Tabs<TValue extends string>({
  activeValue,
  className,
  items,
  onChange
}: TabsProps<TValue>) {
  return (
    <div className={cn("kit-tabs", className)}>
      {items.map((item) => {
        const isActive = item.value === activeValue;

        return (
          <button
            className={cn(
              "min-h-12 px-4 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              isActive
                ? "border-b-2 border-acid text-acid"
                : "text-muted hover:text-paper",
              item.disabled && "cursor-not-allowed bg-ink text-white/28 hover:text-white/28"
            )}
            aria-pressed={isActive}
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
