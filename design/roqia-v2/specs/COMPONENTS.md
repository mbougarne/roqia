# Component contracts

These are implementation specifications, not exported React components. RQ-002 builds the primitives; feature tickets compose them. All accept semantic theme tokens, scale/reflow and accessibility props.

| Component | Layout and variants | Required behavior/states |
| --- | --- | --- |
| Screen | Safe area, 20 dp padding, background token | Scroll where needed; keyboard insets; hydration/loading/error |
| AppText | Typography role, semantic color, optional LTR run | Forward native Text props; language, selectable content and accessibility supported |
| Icon / IconButton | 24 dp visible icon inside 48 dp target | Label required for icon-only action; disabled/pressed/focus; explicit directional asset |
| Header | 18 sp title; right back; optional left overflow | Title wraps; no 36 sp hero heading; root headers have no false back route |
| BottomTabs | Five equal items; 24 dp icon, 11 sp label | Active icon + label/indicator; correct accessibility selected state; no setup/detail tabs |
| Card | 16 radius, 16 padding, subtle border | Flat reading surface; optional selected/status border; no nested press conflict |
| Button | Primary, secondary, text, danger; 48 dp minimum | Idle/pressed/loading/disabled; loading text remains intelligible |
| SettingsRow | 56 dp minimum, label, secondary value, icon or control | Entire row action is unambiguous; avoid duplicate row and switch activation |
| RadioCard | Text, metadata, selected radio | One choice per group; changing choice does not download immediately |
| CheckboxRow | Label, optional size, selection | Selected count/bytes recompute; unavailable row clearly disabled |
| SegmentedControl | Two or three text options | Accessible single selection; wrap/reflow at large font scale |
| SwitchRow | Label and state | Permission denied state can differ from desired setting; report effective state |
| Slider / Stepper | Label, explicit Western value | Increment/decrement accessibility; bounded values; no hidden gesture-only action |
| SearchField | Label, clear and search icon, 48 dp minimum | Debounce local search; query/result/no-results; do not log query content |
| StatusBanner | Info, success, warning, danger | Text + icon; optional retry/settings action; no blocking network banner on usable content |
| ProgressRow | Title, bytes, progress, pause/cancel | Indeterminate when total unknown; distinguish paused, queued, verifying and ready |
| DevotionalCard | Source text, metadata, counter and copy/bookmark/audio actions | Only explicit counter/card action decrements; inner actions do not; zero clamps; errors visible |
| Counter | Remaining count, completion, reset | Original repeat metadata immutable; manual count and audio playback independent |
| VerseBlock | Canonical text, separate Western marker, optional translation | Edition font; source-aware IDs; translation LTR below; no guessed word highlighting |
| SurahRow | Canonical chapter number, name and metadata | Chapter number is not visible-list index; installed/download status |
| MiniPlayer | 72 dp minimum, title, play/pause, progress | Remains visible paused; opens full player; never obscures tab bar/content |
| FullPlayer | Seek, previous/next, speed, repeat, sleep timer | Disabled seek until duration known; file errors and audio-focus interruption handled |
| PrayerRow | Prayer name, localized Western time, alert mode | Sunrise has no adhan action; next prayer highlighted; effective alert state shown |
| Compass | North-referenced frame, numeric bearing, rotated arrow | True heading conversion, confidence and unavailable sensor state; no fake alignment |
| ConfirmationSheet | Title, exact consequences, confirm/cancel | Reset and delete distinct; preserve focus; back cancels; prevent duplicate confirm |
| EmptyState | Small themed illustration, short text and one useful action | Distinguish empty, unavailable, denied and failed; no invented decorative quotations |

## Behavior details

Counter reset affects counts only. Page reset targets a specific set of stable IDs; global reset targets ruqya/adhkar/dua/tasbih counts and leaves downloaded files, bookmarks, settings and Quran reading positions untouched.

Downloaded state requires validated bytes in durable storage. A 100% transport progress row may still be verifying. Do not allow incomplete files to play. Delete confirmation reports selected file count and actual bytes; stop active playback before deleting its file.

Screen 39's alert icons should use one consistent mapping across themes: full adhan = bell, notification-only = bell with a small text mode, off = crossed bell. Do not infer modes from filled versus outlined icon alone.

The theme toggle from old headers moves to Settings, with optional shortcut from More. Reader-specific settings remain in the reader toolbar. Five root tabs are not repeated on mushaf selection, download setup, readers, player or settings screens.
