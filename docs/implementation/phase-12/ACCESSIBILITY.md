# Narrow and enlarged-text inspection

These are representative layout checks on the same API 36 emulator, not full TalkBack, contrast or physical-device acceptance. The normal 48-screen light/dark matrix is separate.

| Condition | Screens inspected | Evidence |
| --- | --- | --- |
| 320 dp width, light, 100% system text | 07, 08, 14, 15, 22, 25, 30, 33, 35, 38, 39, 40, 42, 43, 47 | `screenshots/narrow/` |
| Normal 411 dp width, dark, 200% system text | The same 15 screens; additionally link error and both reset confirmations (19, 20, 21) | `screenshots/large/` |

Long content scrolls and grouped rows expand. Quran source text retains its independently selected reader size. Tasbih text moves outside the fixed ring at large system text. Prayer rows wrap into a vertical layout when needed. The player inspection found awkward word wrapping in the three option buttons; they now stack below 360 dp or above 120% system text, and the two affected captures are repeated on the corrected build.

These captures cover visible layout and the exercised navigation/confirmation controls. They do not prove every scroll position, every content length, simultaneous 320 dp plus 200% text, or every screen-reader gesture. The broader ticket accessibility criterion remains unchecked for that reason. Device width and system text scaling are restored after the checks.
