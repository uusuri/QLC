# QLC Frontend Component Guide

Короткий контекст для новых компонентов Sprint 2.

- Используй компоненты из `frontend/components/ui`: `Button`, `ButtonLink`, `Panel`, `Alert`, `StatusBadge`, `Skeleton`, `Progress`, `Tabs`.
- Стиль: Marathon-inspired dark UI, строгая сетка, прямые углы, моноширинная типографика, теплый акцент `#ff6a3d`.
- Не добавляй API-запросы в компоненты. Сетевой код живет в `frontend/services/api.ts`.
- Статус должен отличаться не только цветом: добавляй короткий текст, рамку, форму или метку.
- Keyboard focus должен оставаться видимым через `focus-visible`.
- Новые зависимости добавляй только если карточка явно требует их или без них нельзя закрыть задачу.
