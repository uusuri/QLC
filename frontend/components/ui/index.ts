// Единый экспорт UI-kit, чтобы страницы импортировали компоненты из одной точки.
export { Alert } from "./Alert";
export { Button, ButtonLink } from "./Button";
export { Panel, PanelBody, PanelHeader } from "./Panel";
export { Progress } from "./Progress";
export { Skeleton, SkeletonStack } from "./Skeleton";
export { StatusBadge } from "./StatusBadge";
export { Tabs } from "./Tabs";

// Экспортируем типы вариантов, чтобы новые компоненты не придумывали свои строки.
export type { AlertTone } from "./Alert";
export type { ButtonVariant } from "./Button";
export type { StatusTone } from "./StatusBadge";
export type { TabItem } from "./Tabs";
