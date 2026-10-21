import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import {useLibrary} from './context';
import {
  indexOptions,
  sectionStarts,
  sectionTarget,
  sectionWord,
  verseCount,
  type IndexKind,
} from './divisions';
import {
  type EditionId,
  type Locator,
  type ReaderSection,
  chapters,
  normalizeSearch,
} from './domain';
import {
  Group,
  SearchField,
  Segments,
  SettingRow,
} from '../../design/components';
import {normalizeDigits} from '../../design/format';
import {AppText, Row, StateView} from '../../design/ui';
import {useFormat} from '../../design/useFormat';

export function QuranIndex({
  editionId,
  packVersion,
  onSelect,
  initialKind,
  allowAyahJump = false,
}: {
  editionId: EditionId;
  packVersion: string;
  onSelect: (locator: Locator) => void;
  initialKind?: IndexKind;
  allowAyahJump?: boolean;
}) {
  const {runtime} = useLibrary(),
    {number} = useFormat();
  const [kind, setKind] = useState<IndexKind>(initialKind ?? 'surah');
  const [query, setQuery] = useState('');
  const touched = useRef(false);
  useEffect(() => {
    let active = true;
    if (!initialKind)
      void runtime
        .indexKind()
        .then(value => {
          if (active && !touched.current) setKind(value);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [runtime, initialKind]);
  const normalized = normalizeSearch(normalizeDigits(query.trim()));
  const jump =
    allowAyahJump &&
    normalizeDigits(query.trim()).match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/);
  const jumpSurah = jump ? Number(jump[1]) : 0,
    jumpVerse = jump ? Number(jump[2]) : 0;
  const validJump =
    jump &&
    jumpSurah >= 1 &&
    jumpSurah <= 114 &&
    jumpVerse >= 1 &&
    jumpVerse <= verseCount(editionId, jumpSurah);
  const entries = sectionStarts(editionId, kind)
    .map((start, i) => {
      const section: ReaderSection = {kind, number: i + 1};
      const title =
        kind === 'surah'
          ? chapters[i].name
          : `${sectionWord(kind)} ${number(i + 1)}`;
      return {start, section, title};
    })
    .filter(
      e =>
        !normalized ||
        (/^\d+$/.test(normalized)
          ? e.section.number === Number(normalized)
          : normalizeSearch(e.title).includes(normalized)),
    );
  return (
    <View style={{gap: 10}}>
      <Segments
        options={indexOptions}
        value={kind}
        onChange={value => {
          touched.current = true;
          setKind(value);
          setQuery('');
          void runtime.setIndexKind(value).catch(() => {});
        }}
      />
      <SearchField
        label={
          kind === 'surah'
            ? 'اسم السورة أو رقمها'
            : kind === 'juz'
              ? 'رقم الجزء'
              : 'رقم الحزب'
        }
        value={query}
        onChange={setQuery}
      />
      {allowAyahJump && (
        <AppText role="caption">
          للانتقال إلى آية، اكتب رقم السورة:الآية، مثل ٢:٢٥٥
        </AppText>
      )}
      {jump ? (
        validJump ? (
          <Row
            title={`الانتقال إلى ${chapters[jumpSurah - 1].name} · الآية ${number(jumpVerse)}`}
            icon="book"
            onPress={() =>
              onSelect(
                sectionTarget(
                  editionId,
                  packVersion,
                  {kind: 'surah', number: jumpSurah},
                  {surah: jumpSurah, verse: jumpVerse},
                ),
              )
            }
          />
        ) : (
          <StateView title="رقم السورة أو الآية غير صالح" />
        )
      ) : entries.length ? (
        <Group>
          {entries.map(({start, section, title}) => (
            <SettingRow
              key={section.number}
              title={title}
              detail={
                kind === 'surah'
                  ? `${number(verseCount(editionId, start.surah))} آيات`
                  : `يبدأ من ${chapters[start.surah - 1].name} · الآية ${number(start.verse)}`
              }
              onPress={() =>
                onSelect(sectionTarget(editionId, packVersion, section))
              }
            />
          ))}
        </Group>
      ) : (
        <StateView title="لا توجد نتيجة مطابقة" />
      )}
    </View>
  );
}
