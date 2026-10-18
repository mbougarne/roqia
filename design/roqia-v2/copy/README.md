# UI copy and identifier contract

ar-MA.json is the canonical starting UI dictionary; plurals.ar-MA.json defines all six Arabic plural categories. Keys are stable English semantic IDs; values are Arabic. French and English Quran translations are content packs, not translations of this UI dictionary. Add missing UI text here during its ticket, rather than hard-coding screen strings.

Use locale ar-MA-u-nu-latn and explicit numberingSystem latn; check Intl behavior on the pinned Hermes runtime. Numeric runs, times, units, email and URLs render LTR within RTL layouts. Fallback digit conversion applies only to generated UI values, never to canonical Quran strings or external text. Use Arabic plural rules; do not concatenate a number with an arbitrary noun.

Do not put Quran verses, hadith quotations, scholarly references or translation corpora into this file. They retain source IDs and editorial review in content packs. Guidance paragraphs come from the reviewed existing noteData. Copy on privacy/terms screens comes from reviewed policy documents.

Format bytes consistently as MB (decimal 1,000,000 bytes); unknown sizes show a label, not 0 MB. Percentages clamp to 0–100 and only appear with a known total. Sample screenshot sizes are not product constants.
