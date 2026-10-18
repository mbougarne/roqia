# Release checklist

All items are pending. This document is a release plan, not permission to publish or proof that the next app is ready.

- [ ] RQ-001 baseline and all relevant source/native feasibility reports are attached.
- [ ] RQ-002–RQ-045 feature acceptance is complete, including capability/error states.
- [ ] All 48 screen references have light/dark implementation captures or an explicitly documented capability-driven adjustment.
- [ ] Canonical Warsh/Hafs content and fonts passed acquisition, structural/hash and qualified rendering review; translations have explicit edition mapping and attribution.
- [ ] Catalog contains only ready entries with real sizes/hashes/URLs; no draft placeholders, screenshot sample values or guessed reciter IDs.
- [ ] Offline reading/listening and interrupted install/delete recovery pass.
- [ ] Released-install migration is tested with the same application ID and signing identity; no clear-data workaround.
- [ ] Quran/adhan do not overlap; background playback, permissions, alarm reconciliation, reboot and Doze evidence is recorded.
- [ ] Morocco city/method/time-zone fixtures and schedule comparisons are accepted; app labels calculations honestly.
- [ ] TalkBack, 200% text, narrow devices, Western digits and both themes pass.
- [ ] Public-host networking and optional location/notification behavior match privacy disclosures; no added analytics/accounts/ad SDKs.
- [ ] Unused dependencies/duplicate players removed only after parity proof; no reference PNGs or source-working files in the APK/AAB.
- [ ] App size, startup/memory and download storage results are recorded against baseline.
- [ ] Version code increases beyond current checkout's 6; preserve name.roqia.app. Confirm actual Play release metadata before choosing the next version.
- [ ] Required Play declarations for foreground services/permissions and current target requirements are reviewed against the shipped implementation.
- [ ] Produce a signed internal-test AAB, verify install/update and smoke journeys, then prepare staged rollout notes and rollback conditions.

Rollout stops for lost user progress, wrong Quran/translation/riwaya association, corrupted completed downloads, duplicate/unexpected adhan, persistent crashes or unreadable Arabic. Keep the previous valid content catalog/pack available for recovery. App binary rollback follows Play versioning constraints; do not promise an in-place downgrade.

No production publishing, store metadata edits, commits, pushes or external messages are part of this planning task.

## Google Play v2 update

Checked 18 October 2026. Assuming Roqia retains production access on its existing listing, our reading of Google's guidance is that a normal v2 update does not restart the mandatory 14-day closed test. That test gates initial production access for qualifying new personal accounts; Google still recommends testing later updates. [Production-access requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

Publish v2 as an update with the same package identity/signing setup and a higher version code. Updates still undergo review. [Google's update instructions](https://support.google.com/googleplay/android-developer/answer/9859350?hl=en).

- [ ] Confirm production access and any app-specific requirements in Play Console; this planning task did not inspect the account.
- [ ] Complete the internal-track/upgrade checks above and a user beta appropriate to the redesign. Its duration is our quality decision, not a newly assumed 14-day waiting period.
- [ ] Keep the existing listing; do not create a new app entry for the v2 redesign.
