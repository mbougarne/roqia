import Clipboard from '@react-native-clipboard/clipboard';
import React, {useEffect, useRef} from 'react';
import {AccessibilityInfo, Alert, Pressable, View} from 'react-native';

import {toggleBookmark} from './bookmarks';
import {useConfirmReset} from './ResetConfirmation';
import {type DataProps} from '../../data';
import {rtlRow} from '../../design/components';
import {
  AppIcon,
  AppText,
  Button,
  Card,
  IconButton,
  usePalette,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';

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
  const {number, digits} = useFormat();
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
  if (dua)
    return (
      <Card style={{gap: 12, padding: 16, borderRadius: 16}}>
        <View style={rtlRow}>
          <IconButton
            name={saved ? 'check' : 'bookmark'}
            label={saved ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات'}
            selected={saved}
            disabled={!bookmarkReady}
            onPress={bookmark}
          />
          <View style={{flex: 1}} />
          <AppIcon name="medallion" size={28} color={p.accent} />
        </View>
        {item.content && (
          <AppText role="devotional" selectable style={{textAlign: 'center'}}>
            {item.content}
          </AppText>
        )}
        {[item.caption, item.note, item.repeatDescription]
          .filter(Boolean)
          .map((text, i) => (
            <AppText
              key={i}
              role="caption"
              selectable
              style={{
                textAlign: 'center',
                color: p.textSecondary,
                ...(i === 0 && {
                  borderTopWidth: 0.5,
                  borderColor: p.borderSubtle,
                  paddingTop: 8,
                }),
              }}>
              {digits(text ?? '')}
            </AppText>
          ))}
        <View style={{...rtlRow, alignItems: 'stretch', gap: 8}}>
          <View
            style={{
              borderWidth: 0.5,
              borderColor: p.borderControl,
              borderRadius: 12,
            }}>
            <IconButton
              name={saved ? 'check' : 'bookmark'}
              label={saved ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات'}
              selected={saved}
              disabled={!bookmarkReady}
              onPress={bookmark}
            />
          </View>
          {files.length > 0 && (
            <View style={{flex: 1, borderRadius: 12, overflow: 'hidden'}}>
              <Button
                icon={
                  audio.activeAudioFile === files[0].fileName &&
                  !audio.isAudioPaused
                    ? 'pause'
                    : 'play'
                }
                label={
                  audio.activeAudioFile === files[0].fileName &&
                  !audio.isAudioPaused
                    ? 'إيقاف مؤقت'
                    : 'استمع'
                }
                onPress={() => void audio.onAudioPress(files[0].fileName)}
              />
            </View>
          )}
          <View
            style={{
              borderWidth: 0.5,
              borderColor: p.borderControl,
              borderRadius: 12,
            }}>
            <IconButton name="copy" label="نسخ النص" onPress={copy} />
          </View>
        </View>
        {!hideCounter && (item.repeat ?? 0) > 0 && (
          <View
            style={{
              ...rtlRow,
              backgroundColor: count ? p.selection : p.successSurface,
              borderRadius: 12,
              overflow: 'hidden',
            }}>
            <Pressable
              disabled={!count}
              accessibilityRole="button"
              accessibilityLabel={
                count
                  ? `المتبقي ${number(count)} · اضغط بعد القراءة`
                  : 'اكتمل الذكر'
              }
              accessibilityState={{disabled: !count}}
              onPress={onCount}
              style={{
                flex: 1,
                minHeight: 56,
                paddingVertical: 8,
                justifyContent: 'center',
              }}>
              <AppText
                role="bodyStrong"
                style={{
                  textAlign: 'center',
                  color: count ? p.textOnSelection : p.success,
                }}>
                {count ? `المتبقي ${number(count)}` : 'تمت القراءة'}
              </AppText>
              <AppText
                role="caption"
                style={{
                  textAlign: 'center',
                  color: count ? p.textOnSelection : p.textSecondary,
                }}>
                {count ? 'اضغط بعد القراءة' : 'للتكرار، أعد العداد'}
              </AppText>
            </Pressable>
            <IconButton
              name="reset"
              label="إعادة عداد هذا الذكر"
              color={count ? p.textOnSelection : p.success}
              onPress={() => confirmReset('إعادة عداد هذا الذكر؟', onReset)}
            />
          </View>
        )}
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
          {digits(item.note)}
        </AppText>
      )}
      {item.repeatDescription && (
        <AppText
          role="caption"
          selectable
          style={{color: p.textSecondary, textAlign: 'center'}}>
          {digits(item.repeatDescription)}
        </AppText>
      )}
      <View style={{...rtlRow, alignItems: 'stretch', gap: 6}}>
        {files.length > 0 && (
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
