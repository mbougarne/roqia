# Prayer, Qibla and adhan solution

Screens 39–46; tickets RQ-036–RQ-044. Prayer calculations and Qibla bearing can run locally; neither requires an app backend or a paid public API. First-use content downloads and optional external maps still need connectivity.

## Location and time

Default to a manually selected city with verified coordinates and IANA time-zone ID. Bundle a reviewed Moroccan city list; include a manual latitude/longitude/time-zone fallback for other locations rather than implying that a small offline list covers the world. RQ-036 sources and validates that dataset. “Use my location” requests a one-shot foreground location; no background tracking is required. Show city/manual fallback on denial, disabled services, timeout or stale fix. GPS may work offline but a quick fix is not guaranteed.

Store coordinates, city ID/name, zone, source (manual/GPS), accuracy and acquisition time. A device time-zone change does not silently reinterpret a manually selected remote city. Offer an explicit use-current-location action when travelling. Use the selected city's civil date to calculate a day, then store event instants in UTC and format them in its zone.

Use Africa/Casablanca with current IANA rules, including Ramadan-related offset changes; never hard-code UTC+1 or add 24 hours to calculate the next civil day. Test Ramadan transitions, midnight, year change and device zone differing from selected city. If zone data is outdated, disclose/repair it through the supported OS/data update path.

## Prayer calculation

Adhan JS is the preferred local calculation candidate. It accepts coordinates/date/parameters and returns absolute times. Its documented method list does not provide a Morocco preset in the version reviewed here; do not call an invented CalculationMethod.Morocco(). RQ-037 creates a versioned custom Morocco profile from authoritative local reference parameters and validates dates/cities across seasons. [Adhan JS](https://github.com/batoulapps/adhan-js), [method definitions](https://github.com/batoulapps/adhan-js/blob/develop/METHODS.md).

The profile records fajr/isha definitions, Asr convention, rounding, any method adjustments and high-latitude handling. User minute offsets are applied once after method calculation. Maintain both raw and adjusted values for diagnostics. For non-Moroccan locations expose supported method selection and Asr/high-latitude options in calculation settings; these supporting controls extend screen 45 and need their normal empty/error states.

The “Morocco” label means the validated calculation profile, not an official synchronized timetable. Compare results with locally approved schedules; record source, date and residual errors. If exact official city times are required, a separately versioned offline timetable pack can override that city/date range with explicit provenance and expiry. Never silently mix stale official rows with calculated rows.

Show Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha. Sunrise is informational and has no adhan toggle. Next-prayer selection considers tomorrow's Fajr after Isha. Countdown is computed from UTC instants, not decremented as the source of truth. Undefined high-latitude results produce an explanatory state and a method choice, not midnight placeholders.

## Qibla

Calculate initial great-circle bearing locally from user coordinates to the chosen verified Kaaba coordinate. Formula: atan2(sin Δλ × cos φK, cos φ × sin φK − sin φ × cos φK × cos Δλ), converted to 0–360 degrees clockwise from true north. Record the coordinate constant's source in RQ-039; use known-city fixtures including Casablanca (~93.7° as an illustrative check), Makkah vicinity and antimeridian cases.

Screen arrow angle = normalized(qiblaTrueBearing − deviceTrueHeading), adjusted for display orientation. Android magnetic azimuth needs declination correction to true north (magnetic heading + east-positive declination); do not subtract twice if the sensor adapter already provides true heading. Use circular smoothing across 359°/0°, not arithmetic averaging. Stop sensor subscription on leaving the screen. [Android position sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position), [GeomagneticField](https://developer.android.com/reference/android/hardware/GeomagneticField).

Report available/low/unreliable/no-sensor states from actual adapter accuracy. Calibration is guidance, not a fake progress animation that guarantees accuracy. With no heading sensor show numerical bearing and a north-up schematic; do not show a rotating “live” compass or aligned badge. The map action is an explicitly external map intent and can fail offline; provide the schematic fallback and label external navigation. True bearing does not require a map API.

## Adhan and reminders

Persist desired mode per prayer: off, notification-only, full-adhan. Pre-prayer reminder is a separate event. Sound metadata includes normal/Fajr variants; never add the Fajr phrase to a normal recording by editing or synthesizing religious audio. Enable the Fajr variant only when a validated matching file exists. Use the existing bundled adan.mp3 only after source/duration/Fajr validation; its existence does not prove Moroccan or Makkah attribution.

Notifee remains the notification adapter. Full adhan is a native scheduled playback problem, not simply a long notification sound. RQ-040 proves AlarmManager/permission handling, foreground media playback start, audio focus and visible stop control on actual Android devices. Android has restrictions on background service starts and exact-alarm access; a denied permission produces an honest reduced-capability state. Do not request full-screen intents or use restricted exact-alarm permissions without the appropriate eligibility. [Android alarms](https://developer.android.com/develop/background-work/services/alarms), [foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types).

Reconcile the schedule after app launch/resume, permission change, city/method/offset change, device clock/zone change, reboot and package replacement. Reboot restores schedules; it must not start playback. Deduplicate by event identity and settings generation. Expired events do not replay adhan hours later. Notification permission, channel status, exact-alarm capability and sound availability are independent effective states.

Keep a bounded rolling window for Notifee notifications, initially 3 days with an overall budget below its documented 50 timestamp triggers (including pre-prayer events and daily reminders). Replenish through the proven native/background path plus app resume; expose the covered horizon if the OS prevents renewal. A JS-only refresh on next app open cannot guarantee indefinite adhan. The native full-adhan scheduler must document its own capacity and rescheduling mechanism in RQ-040/RQ-044. [Notifee triggers](https://notifee.app/react-native/docs/triggers/).

Daily adhkar reminders use local civil times and selected weekdays. They are opt-in for fresh installs. Preserve existing users' preferences/times during migration. Request notification permission in context and display a test-notification action. Never treat saving a switch as proof that an OS alarm was successfully scheduled.

## Required device cases

Foreground, background, locked screen, Doze/battery saver, reboot, force-stop/reopen, permission revoked, channel disabled, missing sound, Bluetooth/call interruption, no sensor, denied location, manual city abroad, Morocco Ramadan transitions and missed scheduled events. RQ-048 records supported behavior and remaining platform limitations before release.
