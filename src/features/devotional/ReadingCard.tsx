import React, {useEffect, useRef} from 'react';
import {AccessibilityInfo, Alert, I18nManager, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {type DataProps} from '../../data';
import {AppText, Button, Card, IconButton, usePalette} from '../../design/ui';
import {number} from '../../design/format';
import {toggleBookmark} from './bookmarks';
import {useConfirmReset} from './ResetConfirmation';
export function ReadingCard({
  item,
  index,
  count,
  saved,
  bookmarkReady,
  onCount,
  onReset,
  audio,
  hideCounter = false,
}: {
  item: DataProps;
  index: number;
  count: number;
  saved: boolean;
  bookmarkReady: boolean;
  onCount: () => void;
  onReset: () => void;
  audio: {
    activeAudioFile: string | null;
    isAudioPaused: boolean;
    onAudioPress: (file: string) => unknown;
  };
  hideCounter?: boolean;
}) {
  const confirmReset = useConfirmReset();
  const p = usePalette();
  const previous = useRef({id: item.id, count});
  useEffect(() => {
    if (
      previous.current.id === item.id &&
      previous.current.count > 0 &&
      count === 0
    )
      AccessibilityInfo.announceForAccessibility('اكتمل الذكر');
    previous.current = {id: item.id, count};
  }, [item.id, count]);

  const files = item.audioArray?.length
    ? item.audioArray
    : item.audioFile
      ? [{fileName: item.audioFile, title: 'استماع'}]
      : [];
  return (
    <Card style={{gap: 16}}>
      <View
        style={{
          flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
          alignItems: 'center',
          gap: 8,
        }}>
        <AppText
          role="caption"
          style={{
            flex: 1,
            color: p.textSecondary,
          }}>{`# ${number(index + 1)}`}</AppText>
        <IconButton
          name={saved ? 'check' : 'bookmark'}
          disabled={!bookmarkReady}
          label={saved ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات'}
          onPress={() => {
            void toggleBookmark(item.id)
              .then(isSaved =>
                AccessibilityInfo.announceForAccessibility(
                  !isSaved ? 'أزيل من المحفوظات' : 'تم الحفظ',
                ),
              )
              .catch(() => Alert.alert('تعذر حفظ التغيير', 'أعد المحاولة.'));
          }}
        />
        <IconButton
          name="copy"
          label="نسخ النص"
          onPress={() => {
            Clipboard.setString(
              [item.caption, item.content, item.note, item.repeatDescription]
                .filter(Boolean)
                .join('\n\n'),
            );
            AccessibilityInfo.announceForAccessibility('تم النسخ');
          }}
        />
      </View>
      {item.caption ? (
        <AppText role="bodyStrong" selectable>
          {item.caption}
        </AppText>
      ) : null}
      {item.content ? (
        <AppText role="devotional" selectable>
          {item.content}
        </AppText>
      ) : null}
      {item.note ? (
        <AppText selectable style={{color: p.textSecondary}}>
          {item.note}
        </AppText>
      ) : null}
      {item.repeatDescription ? (
        <AppText role="caption" selectable>
          {item.repeatDescription}
        </AppText>
      ) : null}
      {!hideCounter && (item.repeat ?? 0) > 0 && (
        <Button
          label={
            count === 0
              ? 'اكتمل الذكر'
              : `المتبقي ${number(count)} · اضغط بعد القراءة`
          }
          disabled={count === 0}
          onPress={() => {
            onCount();
          }}
        />
      )}
      {files.map(file => (
        <Button
          key={file.fileName}
          secondary
          icon={
            audio.activeAudioFile === file.fileName && !audio.isAudioPaused
              ? 'pause'
              : 'play'
          }
          label={`${audio.activeAudioFile === file.fileName && !audio.isAudioPaused ? 'إيقاف مؤقت' : 'استماع'}${file.title === 'استماع' ? '' : ` · ${file.title}`}`}
          onPress={() => {
            void audio.onAudioPress(file.fileName);
          }}
        />
      ))}
      {(item.repeat ?? 0) > 0 && (
        <Button
          secondary
          label="إعادة عداد هذا الذكر"
          icon="reset"
          onPress={() => confirmReset('إعادة عداد هذا الذكر؟', onReset)}
        />
      )}
    </Card>
  );
}
