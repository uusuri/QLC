# QLC source inventory for the Figma foundation

Read-only audit: 2026-09-08. Source: `/Users/uusuri/Documents/JavaProjects/QLC/frontend`.
The source has extensive uncommitted work in frontend and backend. No repository files were modified by this audit. No applicable on-disk `AGENTS.md` was found in the ancestor directories or repository. The user-provided instruction asks for truth and a good result.

The approved current Figma homepage is the visual authority. Existing source palettes, white panels, poster typography and decorative components are historical implementation evidence, not a mandate to reproduce rejected styling.

## Existing routes and requested additions

| Product area | Current source | Design scope |
|---|---|---|
| Public homepage | `/`, `LearningHero`, `CourseList`, `ContinueLearning`, header/footer | Preserve approved Figma homepage. |
| Authentication | `/login`, `/register`, shared `AuthForm`; username/password, email and password confirmation for registration; Telegram login | Reusable auth fields and error/loading/success patterns. |
| Catalog | Embedded in homepage at `/#courses`; no standalone `/courses` page | New complete catalog/search/filter/sort/pagination/loading/empty screen. |
| Course overview / program | `/courses/[slug]`; same route handles free, locked and purchased access; modules/lessons/task outlines; buy or continue CTA | Separate Figma views for purchase overview and enrolled course, reusable program tree. Route split is an implementation decision. |
| Profile / learning progress | `/profile`; username/email, course/task totals; course progress, collapsible modules and lesson rows; next lesson | Extend with avatar/profile details, XP/level, achievements and profile tabs. XP, streak, achievements and dates are not in current auth/progress DTOs. |
| Checkout | `/checkout?course=...`, `CheckoutClient`, `PaymentMethodSelector`; persistent cart; test access purchase then redirects to profile | New complete checkout states, promo/payment details, success screen. Current payment flow is explicitly test mode; real provider/form and separate success route are future work. |
| Lesson + practice | `/lessons/[id]`, material/practice navigation; multi-task selector; CODE editor, TEST options, NUMERIC placeholder | Preserve content/task relationship and Monaco. Add designed content-block library and lesson navigation states. |
| Administration | `/admin/content` with guarded content management | Exists outside explicit new brief; preserve rather than silently redesign. |
| Future activities | No dedicated transfer/review/incident/project/mastery/repetition route or DTO | Components are design preparation, not existing backend functionality. |

## Existing coding workspace: preserve these behaviors

`components/CodeLessonWorkspace.tsx` uses locally bundled Monaco through `@monaco-editor/react`, not a mock textarea. The existing editor must remain the editor.

- Lesson practice splits statement and editor at XL: roughly 42.5% / 57.5%; narrower widths stack. The brief's 35–40% / 60–65% is a modest surrounding-layout adjustment.
- Editor header: `Ваше решение`, language badge, autosave explanation; file bar shows `Main.java` or `main.cpp` and `Сбросить код`.
- Java 21 or C++23 is fixed by the task. No language dropdown exists today.
- Draft autosaves on this device, scoped to task ID and test-set version. Reset restores backend starter/template code. Do not lose or hide this behavior.
- Monaco uses line numbers, word wrap, no minimap, tab size 2, 14px font/23px line height, automaticLayout. Height is 50dvh with 340–640px limits on small screens and 540px from small breakpoint.
- Source byte count and 65,535-byte limit. Empty/oversized source validation.
- Main action is `Проверить решение` (busy: `Проверяем решение`); secondary `Обновить статус` resumes polling for the last submission. Guest editor is available, submission requires sign-in and safe return URL.
- Submission phases: idle, submitting, queued, compiling, running, accepted, wrong answer, compile error, time limit, memory limit, runtime error, output limit, network error, infrastructure error, cancelled, unknown. Preserve these additional states beyond the brief's minimum.
- Result contains friendly status/description, optional runtime/memory, safe backend output log. Busy state prevents duplicate submission and reset. Status can be resumed after refresh.
- There is no independent Run action, stdin field, fullscreen control, console/tests tabs or individual failed-test expected/actual data in the current workspace/DTO. These can be prepared as future optional Figma variants/slots without presenting them as implemented behavior.
- Never put private judge cases or correct answers into learner mock data copied from admin DTOs. LearnerTaskDto intentionally omits these.

## Progress: continuous by data, status by variants

`components/ui/Progress.tsx` already takes a numeric `value`, clamps finite input to 0…100 and uses the exact unrounded value for the fill width. Only the displayed percent and current ARIA value are rounded. It is not restricted to 10% steps. There is currently no fill-width transition.

Figma should expose a reusable continuous fill track and numeric value/content documentation; show arbitrary examples such as 31%, 48%, 65%, 72%, 84%. Do not create 101 component variants or couple status to a 25%-step choice. Recommended behavioral properties:

- `kind`: linear / XP / circular;
- `value`: number 0…100; `label`, optional `current` and `total`;
- `state`: determinate / indeterminate / unavailable; completion is 100, not a new numerical system;
- `tone`: primary / secondary / subdued, `size`: compact / default;
- `showValue`, `showLabel`, `disabled` as independent booleans where needed;
- TS implementation later interpolates fill changes smoothly, respects reduced motion, handles 0 and 100 exactly, and does not quantize the fill to its rounded text label.

Current progress DTO counts unique accepted tasks, not simply opened/read lessons. `LessonProgressDto` has `solvedTasks`, `totalTasks`, `progressPercent`; module progress derives from children; `MyCourseProgressDto` adds full module/lesson map. Maintain distinctions between course completion, lesson reading progress, task mastery and XP progression in future schemas.

## Reusable semantic contracts to carry into Figma

| Component | Stable or useful properties |
|---|---|
| Button | Existing primary/secondary/danger, loading, disabled, label/icon, link vs action. Add text variant and S/M/L without separate content copies. |
| Tabs | `activeValue`, items `{value,label,disabled}`; selected state independent of label. |
| Badge / Alert | neutral / success / warning / danger / info; visible icon/text as well as color. Alerts have title/body. |
| Course/Card | One component with artwork slot, category, title, description, difficulty, duration, modules, price/oldPrice/discount and access/progress states. Existing DTO already has title/description/imageUrl/badge/lesson count/prices/access, but source CourseCard currently draws a typographic cover rather than imageUrl. |
| Course/ProgressCard | course title/artwork, completed/total lessons or tasks, continuous value, next lesson, action. Label count units explicitly. |
| Module/Card | number/title/description, expanded/collapsed, access, completed/total lesson count, continuous progress. |
| Lesson/Row | completed/current/not started/locked/failed, title, value, count, optional XP/type. Locked is access; zero progress is not automatically locked. |
| Achievement/Card | glyph instance swap, title/description, reward, category/rarity, locked/unlocked/progress, current/target, obtained date. 20–30 added glyphs are icon components, not 20–30 unique card components. |
| Task/Status | phase, title/body, metrics, optional safe log / failed-test details; use existing lifecycle as baseline. |
| Activity/Card | type + status + data slots; do not bake title or XP into type variants. |
| Auth/Field | label/value/help/error, required/disabled, input type, password visibility; loading is form-wide as appropriate. |
| Payment/Method | selected/enabled/disabled, title/body/tag; provider-neutral future slots. |
| PageState | loading / empty / error / missing / restricted, title/body/action, optional secondary action. |

## Fonts and tokens found in code

Source uses Inter for UI, IBM Plex Mono with system fallbacks for microcopy, and a local Roboto Condensed Black file aliased as `QLC Display` for old display layouts. The accepted Figma typography takes precedence over this display face.

Current source token names: acid/phosphor `#c4ff00`; ink `#101112`; panel `#191b1c`; surface `#141617`; raised `#222526`; paper `#f0f0e8`; cobalt/signal-blue `#3c32f5`; coral `#ff6652`; line white at 12%; muted paper at 64%. Monaco already uses background `#0a0a0a`, lime cursor/keywords, subdued comments, and distinct string/number/type syntax colors.

Do not silently overwrite accepted Figma variable values with these historical hexes. Reuse the Figma semantic variables, create missing semantic roles intentionally, and document token mapping for implementation.

## Content and accessibility edges for the foundation

- Existing SafeMarkdown supports headings, paragraphs, unordered lists, fenced syntax-highlighted code and inline emphasis/code. Images/diagrams/tables/quotes/callouts/interactive blocks in the brief are new designed content types.
- Existing shared controls usually use 48px minimum height; header/menu/links often 44px. Keep 44px touch targets in mobile compositions.
- Existing source has keyboard focus, auth redirect return paths, loading/error/empty/restricted states and mobile menu Escape handling. Carry these into the component specification.
- New catalog ratings, XP, duration, achievements and learning mechanics should use coherent example content in Figma, clearly documented as future data fields in handoff rather than backend-backed facts.
