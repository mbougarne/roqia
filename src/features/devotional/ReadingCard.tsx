import React, {useEffect, useRef} from 'react';
import {
  AccessibilityInfo,
  Alert,
  I18nManager,
  Pressable,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {type DataProps} from '../../data';
import {
  AppIcon,
  AppText,
  Button,
  Card,
  IconButton,
  usePalette,
} from '../../design/ui';
import {number} from '../../design/format';
import {Ornament, rtlRow} from '../../design/components';
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
  dua = false,
  showCompletion = false,
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
  dua?: boolean;
  showCompletion?: boolean;
}) {
  const confirmReset = useConfirmReset();
  const p = usePalette();
  const completed =
    showCompletion && !hideCounter && (item.repeat ?? 0) > 0 && count === 0;
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
  const copy = () => {
    Clipboard.setString(
      [item.caption, item.content, item.note, item.repeatDescription]
        .filter(Boolean)
        .join('\n\n'),
    );
    AccessibilityInfo.announceForAccessibility('تم النسخ');
  };
  const bookmark = () =>
    void toggleBookmark(item.id)
      .then(isSaved =>
        AccessibilityInfo.announceForAccessibility(
          isSaved ? 'تم الحفظ' : 'أزيل من المحفوظات',
        ),
      )
      .catch(() => Alert.alert('تعذر حفظ التغيير', 'أعد المحاولة.'));
  return (
    <Card
      style={{
        gap: 8,
        padding: 12,
        ...(completed && {
          backgroundColor: p.successSurface,
          borderColor: p.success,
        }),
      }}>
      <View style={rtlRow}>
        <AppText
          role="caption"
          style={{
            backgroundColor: p.surfaceMuted,
            borderRadius: 6,
            paddingHorizontal: 7,
            color: p.accent,
          }}>
          {number(index + 1)}
        </AppText>
        <AppText role="caption" style={{flex: 1, color: p.textSecondary}}>
          {item.caption || 'ذكر'}
        </AppText>
        <IconButton
          name={saved ? 'check' : 'bookmark'}
          label={saved ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات'}
          disabled={!bookmarkReady}
          onPress={bookmark}
        />
      </View>
      {item.content && (
        <AppText
          role="devotional"
          selectable
          style={{textAlign: 'center', paddingVertical: 4}}>
          {item.content}
        </AppText>
      )}
      {item.note && (
        <AppText
          role="caption"
          selectable
          style={{color: p.textSecondary, textAlign: 'center'}}>
          {item.note}
        </AppText>
      )}
      {item.repeatDescription && (
        <AppText
          role="caption"
          selectable
          style={{color: p.textSecondary, textAlign: 'center'}}>
          {item.repeatDescription}
        </AppText>
      )}
      {dua && files.length > 0 && (
        <Button
          icon={
            audio.activeAudioFile === files[0].fileName && !audio.isAudioPaused
              ? 'pause'
              : 'play'
          }
          label={
            audio.activeAudioFile === files[0].fileName && !audio.isAudioPaused
              ? 'إيقاف مؤقت'
              : 'استماع'
          }
          onPress={() => void audio.onAudioPress(files[0].fileName)}
        />
      )}
      <View style={{...rtlRow, alignItems: 'stretch', gap: 6}}>
        {!dua && files.length > 0 && (
          <IconButton
            name={
              audio.activeAudioFile === files[0].fileName &&
              !audio.isAudioPaused
                ? 'pause'
                : 'volume'
            }
            label={
              audio.activeAudioFile === files[0].fileName &&
              !audio.isAudioPaused
                ? 'إيقاف مؤقت'
                : 'استماع'
            }
            onPress={() => void audio.onAudioPress(files[0].fileName)}
          />
        )}
        {!hideCounter && (item.repeat ?? 0) > 0 && (
          <Pressable
            disabled={!count}
            accessibilityRole="button"
            accessibilityLabel={
              count
                ? `المتبقي ${number(count)} · اضغط بعد القراءة`
                : completed
                  ? 'تمت القراءة · يمكنك إعادة العداد من زر الإعادة'
                  : 'اكتمل الذكر'
            }
            accessibilityState={{disabled: !count}}
            onPress={onCount}
            style={{
              flex: 1,
              minHeight: 48,
              backgroundColor: completed ? p.successSurface : p.selection,
              borderRadius: 10,
              padding: 5,
              justifyContent: 'center',
            }}>
            <View style={{...rtlRow, justifyContent: 'center', gap: 6}}>
              {completed && (
                <AppIcon name="check" size={20} color={p.success} />
              )}
              <AppText
                role="bodyStrong"
                style={{
                  textAlign: 'center',
                  color: completed ? p.success : p.textOnSelection,
                }}>
                {count
                  ? `المتبقي ${number(count)}`
                  : completed
                    ? 'تمت القراءة'
                    : 'اكتمل الذكر'}
              </AppText>
            </View>
            <AppText
              role="caption"
              style={{
                textAlign: 'center',
                color: completed ? p.textSecondary : p.textOnSelection,
              }}>
              {completed ? 'للتكرار، أعد العداد' : 'اضغط بعد القراءة'}
            </AppText>
          </Pressable>
        )}
        <IconButton name="copy" label="نسخ النص" onPress={copy} />
        {(item.repeat ?? 0) > 0 && (
          <IconButton
            name="reset"
            label="إعادة عداد هذا الذكر"
            onPress={() => confirmReset('إعادة عداد هذا الذكر؟', onReset)}
          />
        )}
      </View>
      {files.slice(1).map(file => (
        <Button
          key={file.fileName}
          secondary
          icon={
            audio.activeAudioFile === file.fileName && !audio.isAudioPaused
              ? 'pause'
              : 'play'
          }
          label={`استماع · ${file.title}`}
          onPress={() => void audio.onAudioPress(file.fileName)}
        />
      ))}
    </Card>
  );
}
