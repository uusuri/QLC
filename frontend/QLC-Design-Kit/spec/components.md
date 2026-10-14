# Инвентарь UI-компонентов QLC

99 семейств. Это локальная спецификация и исходники элементов; статус импорта в Figma ведётся отдельно.

Числа в Progress, Level и XP — примеры данных. В Figma и коде они не становятся списком числовых variants.

## Button/Primary

Состояния: default, hover, pressed, focus, disabled, loading.

**Свойства:** label → TEXT, icon → INSTANCE_SWAP, showIcon → BOOLEAN, size → S|M|L.

Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Button/Secondary

Состояния: default, hover, pressed, focus, disabled, loading.

**Свойства:** label → TEXT, icon → INSTANCE_SWAP, showIcon → BOOLEAN, size → S|M|L.

Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Button/Ghost

Состояния: default, hover, pressed, focus, disabled, loading.

**Свойства:** label → TEXT, icon → INSTANCE_SWAP, showIcon → BOOLEAN, size → S|M|L.

Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Button/Text

Состояния: default, hover, pressed, focus, disabled, loading.

**Свойства:** label → TEXT, icon → INSTANCE_SWAP, showIcon → BOOLEAN, size → S|M|L.

Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Button/Danger

Состояния: default, hover, pressed, focus, disabled, loading.

**Свойства:** label → TEXT, icon → INSTANCE_SWAP, showIcon → BOOLEAN, size → S|M|L.

Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Button/Icon

Состояния: default, hover, pressed, focus, disabled, loading.

**Свойства:** label → TEXT, icon → INSTANCE_SWAP, showIcon → BOOLEAN, size → S|M|L.

Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Text

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Search

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Password

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN, showPassword → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Email

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Number

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Promo

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Input/Code

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, placeholder → TEXT, helper → TEXT, error → TEXT, required → BOOLEAN, trailingIcon → INSTANCE_SWAP, hasValue → BOOLEAN.

Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Textarea

Состояния: default, focus, disabled.

**Свойства:** label → TEXT, value → TEXT, helper → TEXT, count → TEXT, hasValue → BOOLEAN.

Vertical; min-height128; manual vertical resize in app; no horizontal resize.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Select

Состояния: default, open, selected, error, disabled.

**Свойства:** label → TEXT, value → TEXT, items → SLOT, multiple → BOOLEAN, searchable → BOOLEAN.

Trigger48; popover anchor below flips above. list max320 high; keyboard listbox.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Checkbox

Состояния: unchecked, checked, mixed, focus, disabled.

**Свойства:** label → TEXT, description → TEXT, checked → BOOLEAN.

Horizontal hit area min44; icon20 + gap12; description wraps below.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Radio

Состояния: unselected, selected, focus, disabled.

**Свойства:** label → TEXT, description → TEXT, checked → BOOLEAN.

Horizontal hit area min44; icon20 + gap12; description wraps below.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Switch

Состояния: off, on, focus, disabled.

**Свойства:** label → TEXT, description → TEXT, checked → BOOLEAN.

Horizontal hit area min44; icon20 + gap12; description wraps below.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Filter/Chip

Состояния: default, selected, removable, disabled.

**Свойства:** label → TEXT, count → TEXT, showCount → BOOLEAN.

Horizontal Hug;44pxhitarea; selected includes check; remove has separate accessible label.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Tabs

Состояния: default, selected, disabled.

**Свойства:** items → SLOT, activeId → TEXT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Accordion

Состояния: collapsed, expanded, disabled.

**Свойства:** title → TEXT, summary → TEXT, body → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Pagination

Состояния: first, middle, last, loading.

**Свойства:** page → TEXT, totalPages → TEXT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## LoadMore

Состояния: default, loading, end.

**Свойства:** loadedCount → TEXT, totalCount → TEXT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Breadcrumbs

Состояния: default, collapsed.

**Свойства:** items → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Menu

Состояния: default, selected, disabled.

**Свойства:** items → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Dropdown

Состояния: closed, open, empty.

**Свойства:** trigger → SLOT, items → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## ContextMenu

Состояния: open, disabled.

**Свойства:** items → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Tooltip

Состояния: default, multiline.

**Свойства:** text → TEXT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Popover

Состояния: default, with-action.

**Свойства:** title → TEXT, body → TEXT, action → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Navigation/Header

Состояния: guest, authenticated.

**Свойства:** logo → INSTANCE_SWAP, items → SLOT, user → INSTANCE_SWAP.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Navigation/Drawer

Состояния: guest, authenticated.

**Свойства:** items → SLOT, user → INSTANCE_SWAP.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Navigation/Sidebar

Состояния: expanded, collapsed.

**Свойства:** course → INSTANCE_SWAP, items → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Section/Header

Состояния: default, with-action.

**Свойства:** title → TEXT, eyebrow → TEXT, action → SLOT.

Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Modal/Confirm

Состояния: default, danger, processing.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Modal/Content

Состояния: small, medium, large.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Drawer

Состояния: default, loading.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Toast

Состояния: success, info, warning, error.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Alert

Состояния: success, info, warning, error.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Badge/Status

Состояния: new, popular, sale, locked, completed, in-progress, review-due.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Badge/Difficulty

Состояния: easy, medium, hard.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Incident/Severity

Состояния: sev-1, sev-2, sev-3.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Spinner

Состояния: default, reduced-motion.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Skeleton

Состояния: page, course-card, lesson, profile, achievement, task.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## EmptyState

Состояния: no-courses, no-active-courses, no-achievements, no-results, no-activity, no-payments.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## ErrorState

Состояния: generic, network, 403, 404, 500, maintenance, offline, reconnecting.

**Свойства:** title → TEXT, description → TEXT, action → SLOT, secondaryAction → SLOT, dismissible → BOOLEAN.

Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Progress/Linear

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Progress/XP

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Progress/Course

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Progress/Module

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Progress/Lesson

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Progress/Skill

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Progress/Circular

Состояния: determinate, indeterminate, unavailable.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Level/Badge

Состояния: default.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## XP/Reward

Состояния: default, pending.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## XP/Summary

Состояния: default, large-values.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## LevelUp/Modal

Состояния: default, multiple-levels.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## SkillProgress/Spiral

Состояния: locked, available, current, completed.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## SkillStage

Состояния: locked, available, current, completed.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## SkillMasteryBadge

Состояния: learning, practiced, mastered.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Review/Due

Состояния: due-soon, due, overdue, refreshed.

**Свойства:** value → NUMBER_CONTRACT, label → TEXT, current → TEXT, total → TEXT, showLabel → BOOLEAN, status → VARIANT.

Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.

## Course/Card

Состояния: available, purchased, coming-soon.

**Свойства:** artwork → INSTANCE_SWAP, icon → INSTANCE_SWAP, title → TEXT, description → TEXT, price → TEXT, oldPrice → TEXT, discount → TEXT, metadata → SLOT, access → VARIANT, showBadge → BOOLEAN, progressState → not-started|in-progress|completed, showDiscount → BOOLEAN, promotion → TEXT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

 Access controls CTA; promotion never overrides purchase state. Nested Progress component carries progress status.

## Course/Progress

Состояния: default, expanded, completed.

**Свойства:** course → SLOT, value → NUMBER_CONTRACT, currentModule → TEXT, currentLesson → TEXT, completed → TEXT, total → TEXT, xp → TEXT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Module/Card

Состояния: not-started, active, completed, locked, review-due.

**Свойства:** number → TEXT, title → TEXT, description → TEXT, progress → NUMBER_CONTRACT, lessons → SLOT, expanded → BOOLEAN.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Lesson/Row

Состояния: not-started, current, completed, locked, review-due.

**Свойства:** typeIcon → INSTANCE_SWAP, title → TEXT, duration → TEXT, xp → TEXT, value → NUMBER_CONTRACT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Activity/Card

Состояния: lesson, task, transfer, code-review, incident, project, quiz.

**Свойства:** type → VARIANT, status → VARIANT, icon → INSTANCE_SWAP, title → TEXT, description → TEXT, duration → TEXT, xp → TEXT, value → NUMBER_CONTRACT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Achievement/Card

Состояния: locked, unlocked, secret.

**Свойства:** icon → INSTANCE_SWAP, title → TEXT, description → TEXT, rarity → VARIANT, progress → NUMBER_CONTRACT, current → TEXT, target → TEXT, date → TEXT, xp → TEXT, newlyUnlocked → BOOLEAN, progressState → not-started|in-progress|completed.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

 Rarity independent of access. Secret projection never contains hidden criterion/title/progress.

## Achievement/Progress

Состояния: determinate, indeterminate, unavailable.

**Свойства:** current → TEXT, target → TEXT, value → NUMBER_CONTRACT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Achievement/Grid

Состояния: default, filtered, empty.

**Свойства:** items → SLOT, filter → TEXT, total → TEXT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Avatar

Состояния: image, initials, empty, loading.

**Свойства:** image → IMAGE_FILL, initials → TEXT, size → 24|32|48|64|96.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## User/MiniProfile

Состояния: default, compact.

**Свойства:** avatar → INSTANCE_SWAP, name → TEXT, username → TEXT, level → TEXT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Profile/Header

Состояния: default, long-name.

**Свойства:** avatar → INSTANCE_SWAP, displayName → TEXT, username → TEXT, joined → TEXT, xp → INSTANCE_SWAP.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Profile/Stats

Состояния: default, large-values, empty.

**Свойства:** items → SLOT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Profile/Activity

Состояния: default, empty.

**Свойства:** items → SLOT.

Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Content/Block

Состояния: title, subtitle, paragraph, image, diagram, code, table, list, quote, warning, tip, note, details, checkpoint, exercise, embed.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Code/Block

Состояния: default, copied, overflow.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Table

Состояния: default, loading, empty, sorted.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Divider

Состояния: plain, technical.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Task/EditorShell

Состояния: idle, busy, auth-required.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Task/Status

Состояния: idle, submitting, queued, compiling, running, accepted, wrong-answer, runtime-error, compilation-error, time-limit, memory-limit, output-limit, network-error, infrastructure-error, cancelled, unknown.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Task/Result

Состояния: accepted, wrong-answer, runtime-error, compilation-error, time-limit, infrastructure-error.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Task/Transfer

Состояния: available, in-progress, submitted, accepted, failed, review.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## CodeReview/Finding

Состояния: draft, submitted, correct, incorrect, partial.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## CodeReview/Result

Состояния: complete, partial.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## CodeReview/Line

Состояния: default, selected, range, with-finding.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Incident/Card

Состояния: active, investigating, mitigated, resolved, failed.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Incident/Evidence

Состояния: logs, metrics, kubernetes, database, network, code, events.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Incident/Diagnosis

Состояния: draft, submitted, rejected.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Incident/Result

Состояния: resolved, failed.

**Свойства:** title → TEXT, body → TEXT, content → SLOT, status → VARIANT, metadata → SLOT, action → SLOT.

Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Payment/Summary

Состояния: default, discount, promo-valid, promo-invalid.

**Свойства:** title → TEXT, fields → SLOT, course → INSTANCE_SWAP, price → TEXT, orderId → TEXT, date → TEXT, message → TEXT.

Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Payment/Method

Состояния: unselected, selected, disabled.

**Свойства:** title → TEXT, fields → SLOT, course → INSTANCE_SWAP, price → TEXT, orderId → TEXT, date → TEXT, message → TEXT.

Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Payment/Form

Состояния: default, validation-error, processing, payment-error, timeout.

**Свойства:** title → TEXT, fields → SLOT, course → INSTANCE_SWAP, price → TEXT, orderId → TEXT, date → TEXT, message → TEXT.

Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Payment/Success

Состояния: default.

**Свойства:** title → TEXT, fields → SLOT, course → INSTANCE_SWAP, price → TEXT, orderId → TEXT, date → TEXT, message → TEXT.

Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Payment/Failed

Состояния: retry, change-method, timeout.

**Свойства:** title → TEXT, fields → SLOT, course → INSTANCE_SWAP, price → TEXT, orderId → TEXT, date → TEXT, message → TEXT.

Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Auth/Form

Состояния: login, register, forgot-password, reset-password, verify-email, verification-success.

**Свойства:** title → TEXT, fields → SLOT, course → INSTANCE_SWAP, price → TEXT, orderId → TEXT, date → TEXT, message → TEXT.

Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

## Course/Artwork

Состояния: default.

**Свойства:** asset → INSTANCE_SWAP, size → NUMBER_CONTRACT, tone → TOKEN.

Fixed proportional vector frame; no stretch; swap asset by stable ID. Artwork32:15.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

20 known sources or symbols; link manifest. No new Course/Card per asset.

## Course/Icon

Состояния: default.

**Свойства:** asset → INSTANCE_SWAP, size → NUMBER_CONTRACT, tone → TOKEN.

Fixed proportional vector frame; no stretch; swap asset by stable ID. Transparent background; optical center and consistent size.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

20 known sources or symbols; link manifest. No new Course/Card per asset.

## Course/Symbol

Состояния: default.

**Свойства:** asset → INSTANCE_SWAP, size → NUMBER_CONTRACT, tone → TOKEN.

Fixed proportional vector frame; no stretch; swap asset by stable ID. Transparent background; optical center and consistent size.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

20 known sources or symbols; link manifest. No new Course/Card per asset.

## Achievement/Icon

Состояния: default.

**Свойства:** asset → INSTANCE_SWAP, size → NUMBER_CONTRACT, tone → TOKEN.

Fixed proportional vector frame; no stretch; swap asset by stable ID. Transparent background; optical center and consistent size.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

30 known sources or symbols; link manifest. No new Course/Card per asset.

## Icon/Utility

Состояния: default.

**Свойства:** asset → INSTANCE_SWAP, size → NUMBER_CONTRACT, tone → TOKEN.

Fixed proportional vector frame; no stretch; swap asset by stable ID. Transparent background; optical center and consistent size.

Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.

Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.

Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.

0 known sources or symbols; link manifest. No new Course/Card per asset.
