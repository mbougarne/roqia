# Design system

## Authority and character

Use warm ivory surfaces in light mode and deep forest surfaces in dark mode, with sage selection, restrained gold, rounded cards and clear Arabic typography. Decoration supports onboarding and section identity; reading surfaces stay quiet. Implement one component vocabulary across both themes rather than copying every small difference in the generated screenshots.

The source of numeric values is tokens/colors.json, tokens/layout.json and tokens/typography.json. Semantic token keys describe use; components do not choose raw hex values. Theme preference is light, dark or system. System preference reacts to OS changes; it is not a one-time initial lookup.

## Color roles

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Background | #F7F5EF | #062B23 | Screen canvas |
| Surface | #FFFFFF | #103D32 | Cards and sheets |
| Primary text | #123B32 | #F7F5EF | Titles, body, scripture |
| Secondary text | #5F6E67 | #AEC1B6 | Metadata; never reduce further with opacity |
| Primary action | #164C3D | #B7D9A5 | Buttons, selected controls |
| Action text | #FFFFFF | #12392E | Text on primary action |
| Accent | #8B641F | #D9BA73 | Decorative linework and restrained emphasis |

Use borderControl for an interactive outline and borderSubtle only for nonessential separators. Normal text target is 4.5:1; meaningful control outlines/icons target 3:1. Status includes an icon and text, never color alone. Disabled controls have both disabled semantics and an explanatory state where necessary. A reset uses a reset arrow; deletion uses a trash icon.

## Typography and layout

- Header: 18 sp / 28 line height, semibold. Section heading: 16/26. Body: 14/24. Helper: 12/20. Button: 14/24. Avoid the existing 36 sp screen title.
- Devotional reading: 21/38; Quran: initial 22/40 with a separate reader setting. A UI text-size preference must not silently change canonical text or verse numbering.
- Noto Sans Arabic is provided unchanged, including variable weights. French/English blocks use native sans-serif fallback, LTR alignment and their language metadata. Font registration and weight resolution require Android verification.
- Use 20 dp side insets, 16 on narrow devices. Card radius 16; control radius 12; sheet radius 24. Minimum touch area is 48 × 48 dp, including tiny visible icons.
- Header minimum 56 dp; bottom tabs minimum 64 plus bottom inset. Controls grow with font scale. Text wrapping and scroll take priority over matching the screenshot height.
- Reference viewport is 393 × 852 dp; check 320, 360, 393, 430 and tablet widths. Center reading content at a maximum width of 560 dp. Never stretch lines across an entire tablet.
- Use real OS status/navigation bars. Do not reproduce the mockup battery, time or gesture line as app assets.

## Arabic, Western digits and accessibility

All UI-generated numbers use Western 0–9. This includes counters, verse badges, chapter indices, percentages, dates, file sizes, countdowns and compass degrees. Use explicit latn formatting and LTR numeric runs. Test a device whose locale normally uses Eastern digits. Do not normalize or substitute characters inside the canonical Quran corpus to accomplish UI formatting.

Arabic back navigation appears on the right and points right. Use logical start/end spacing rather than global screen mirroring. Do not mirror media playback icons, maps, compass headings or numeric sequences. Long source URLs, email addresses and bilingual text must not reorder punctuation.

Every interactive element has a role, Arabic accessible name, state and minimum target. Focus order follows reading order. Decorative SVGs are inaccessible. Announce completion and download failure once; do not announce every progress tick. Preserve OS font scaling and test at 200%; reading marks must not clip. Respect reduced motion. A checked bookmark/toggle must be identifiable without color.

## Images and assets

Use the supplied standalone SVG icons and themed illustrations. They intentionally contain no scripture or publisher logos. The reference images are a visual guide, not an asset sheet. Do not crop religious text or book-cover lettering out of them.

The actual Quran font is part of its edition package. If a source only offers page images, preserve those pages, expose only supported capabilities, and document that embedded page numerals cannot be converted by a UI setting. Reflowable Warsh and Western verse badges require a verified source text/font path. This is an explicit RQ-016 release decision, not a silent font fallback.

## Consistent interaction

Pressed opacity/scale uses the motion tokens; disabled controls do not animate. Buttons keep their width while loading and block duplicate requests. Sheets support Android back and a visible cancel action. Destructive deletion/reset explains the exact scope. Downloads never begin solely because a row became selected.

Source selection, audio quality, translation, verse search and synchronized highlighting are capability-driven. Hide or explain unavailable options rather than showing a control that cannot work. No accounts, premium badge, ads, streaks, social feed or monetization component belongs in this release.
