# Reusable assets

The icon and illustration SVGs are original vector assets created for this project, under the repository MIT license (see LICENSE-project.txt). They are normalized replacements for the visual language of the generated screenshots, not pixel extractions. No provider logos, calligraphy, or Quran glyphs were reconstructed.

Icons use a 24 × 24 viewBox, 1.75 stroke, round caps and currentColor. Set color from semantic tokens and use a 48 dp touch wrapper. An SVG displayed as an external image does not inherit CSS currentColor; inline the trusted source or pass color through the future React Native SVG component. Use the explicit right chevron for Arabic back navigation. Media and compass symbols never mirror.

Illustrations have transparent backgrounds, a 240 × 180 viewBox (96 × 96 for the repeating rosette tile), and separate light/dark palettes. Use them at 120–180 dp wide on onboarding or empty states. They are decorative and should be hidden from the accessibility tree. Keep rosette tiles out of reading surfaces.

The existing Arabic variable font is copied unchanged, with its OFL license. UI text uses this font. Quran fonts belong to the content edition pack and must be validated with that edition. Latin text can use the native sans-serif fallback.

Copy/adopt only required assets into the runtime in the relevant ticket. No automatic import or app configuration has been added. Do not bundle reference screenshots. Existing launcher icons and the app identity remain until a separate launcher/icon review; these illustrations are not launcher assets.
