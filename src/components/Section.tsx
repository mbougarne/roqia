import React, {type FC, useContext} from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Pressable,
  type GestureResponderEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';

import {type DataProps} from '../data';
import {getPressableScaleStyle} from './pressableStyles';
import {type ContextState, themeContext, themes} from '../store';
import {StyledText} from './StyledText';

type AudioStatus = 'idle' | 'paused' | 'playing';

type SectionProp = DataProps & {
  activeAudioFile?: string | null;
  isAudioPaused?: boolean;
  count: number;
  onPress: () => void;
  onReset?: () => void;
  onAudioFilePress?: (fileName: string) => void;
};

export const Section: FC<SectionProp> = item => {
  const {mode} = useContext<ContextState>(themeContext);
  const safeCount = Number.isFinite(item.count) ? Math.max(0, item.count) : item.repeat ?? 0;
  const isDone = safeCount === 0;
  const theme = themes[mode];
  const sectionBackgroundColor = isDone
    ? theme.activeBg
    : mode === 'dark'
      ? theme.secondaryBg
      : theme.bg;
  const canPlayAudio = !!item.audioFile && !!item.onAudioFilePress;
  const hasPlaylist = !!item.audioArray?.length && !!item.onAudioFilePress;
  const isSingleAudioPlaying =
    !!item.audioFile && item.activeAudioFile === item.audioFile && !item.isAudioPaused;

  const onCopy = () => {
    Clipboard.setString(item.content!);
  };

  const onCopyPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onCopy();
  };

  const onAudioButtonPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (item.audioFile) {
      item.onAudioFilePress?.(item.audioFile);
    }
  };

  const onResetPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    item.onReset?.();
  };

  const onPlaylistAudioPress = (
    event: GestureResponderEvent,
    fileName: string,
  ) => {
    event.stopPropagation();
    item.onAudioFilePress?.(fileName);
  };

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={require('../assets/images/arabesque.png')}
        style={[
          styles.backgroundContainer,
          {backgroundColor: sectionBackgroundColor},
        ]}
        imageStyle={[
          styles.backgroundStyle,
          mode === 'dark' && !isDone && styles.darkInactiveBackgroundStyle,
        ]}>
        <Pressable
          accessibilityHint="ينقص العداد الحالي بمقدار واحد"
          accessibilityLabel={`الذكر ${item.caption ?? ''}. المتبقي ${safeCount}`}
          accessibilityRole="button"
          onPress={item.onPress}
          style={({pressed}) => [
            styles.container,
            getPressableScaleStyle(pressed, 0.92, 0.992),
          ]}>
          <View>
            {item.isStacked && item.note ? (
              <StyledText
                customStyle={[
                  styles.note,
                  {color: isDone ? theme.secondaryColor : theme.tertiaryColor},
                ]}>
                {item.note}
              </StyledText>
            ) : null}
            <StyledText
              customStyle={[
                styles.caption,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.caption}
            </StyledText>
            <StyledText
              customStyle={[
                styles.content,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.content}
            </StyledText>
            <StyledText
              customStyle={[
                styles.repeat,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.repeatDescription}
            </StyledText>
            {hasPlaylist ? (
              <View style={styles.playlistContainer}>
                {item.audioArray?.map(audioItem => {
                  const isTrackPlaying =
                    item.activeAudioFile === audioItem.fileName && !item.isAudioPaused;

                  return (
                    <Pressable
                      accessibilityHint="يشغل أو يوقف المقطع الصوتي لهذا العنصر"
                      accessibilityLabel={`تشغيل أو إيقاف ${audioItem.title}`}
                      accessibilityRole="button"
                      key={audioItem.fileName}
                      onPress={event =>
                        onPlaylistAudioPress(event, audioItem.fileName)
                      }
                      style={({pressed}) => [
                        styles.playlistItem,
                        getPressableScaleStyle(pressed, 0.82, 0.98),
                      ]}>
                      <StyledText
                        customStyle={[
                          styles.playlistTitle,
                          {
                            color: isDone ? theme.secondaryColor : theme.color,
                          },
                        ]}>
                        {audioItem.title}
                      </StyledText>
                      <View style={styles.playlistAction}>
                        <Icon
                          name={isTrackPlaying ? 'pause' : 'play-arrow'}
                          color={isDone ? theme.secondaryColor : theme.tertiaryColor}
                          size={24}
                        />
                        <StyledText
                          customStyle={[
                            styles.audioText,
                            {
                              color: isDone ? theme.secondaryColor : theme.tertiaryColor,
                            },
                          ]}>
                          {isTrackPlaying ? 'إيقاف' : 'إستمع'}
                        </StyledText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <View style={styles.bottomContainer}>
            <View style={styles.bottomItem}>
              {isDone ? (
                <Pressable
                  accessibilityHint="يعيد هذا العداد إلى قيمته الأصلية"
                  accessibilityLabel="إعادة عداد هذا الذكر"
                  accessibilityRole="button"
                  onPress={onResetPress}
                  style={({pressed}) => [
                    styles.resetButton,
                    getPressableScaleStyle(pressed, 0.82, 0.94),
                  ]}>
                  <Icon
                    name="restart-alt"
                    color={theme.secondaryColor}
                    size={24}
                  />
                  <StyledText
                    customStyle={[
                      styles.resetText,
                      {color: theme.secondaryColor},
                    ]}>
                    إعادة
                  </StyledText>
                </Pressable>
              ) : (
                <StyledText
                  customStyle={[
                    styles.repeatNumber,
                    {
                      color: theme.tertiaryColor,
                    },
                  ]}>
                  {safeCount}
                </StyledText>
              )}
            </View>
            <View style={styles.bottomItem}>
              {canPlayAudio ? (
                <Pressable
                  accessibilityHint="يشغل أو يوقف التلاوة الصوتية"
                  accessibilityLabel={isSingleAudioPlaying ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                  accessibilityRole="button"
                  onPress={onAudioButtonPress}
                  style={({pressed}) => [
                    styles.audioButton,
                    getPressableScaleStyle(pressed, 0.82, 0.94),
                  ]}>
                  <Icon
                    name={isSingleAudioPlaying ? 'pause' : 'play-arrow'}
                    color={isDone ? theme.secondaryColor : theme.tertiaryColor}
                    size={28}
                  />
                  <StyledText
                    customStyle={[
                      styles.audioText,
                      {
                        color: isDone ? theme.secondaryColor : theme.tertiaryColor,
                      },
                    ]}>
                    {isSingleAudioPlaying ? 'إيقاف' : 'إستمع'}
                  </StyledText>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.bottomItem}>
              <Pressable
                accessibilityHint="ينسخ نص الذكر إلى الحافظة"
                accessibilityLabel="نسخ النص"
                accessibilityRole="button"
                onPress={onCopyPress}
                style={({pressed}) => [
                  styles.copyButton,
                  getPressableScaleStyle(pressed, 0.82, 0.94),
                ]}>
                <Icon
                  name="content-copy"
                  color={isDone ? theme.secondaryColor : theme.tertiaryColor}
                  size={28}
                />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backgroundContainer: {
    marginBottom: 50,
    paddingVertical: 25,
    width: 320,
    minHeight: 175,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.16,
    shadowRadius: 1.51,
    elevation: 2,
  },
  backgroundStyle: {
    resizeMode: 'repeat',
  },
  darkInactiveBackgroundStyle: {
    opacity: 0.22,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    fontSize: 18,
  },
  note: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  caption: {
    marginVertical: 5,
    fontWeight: '200',
  },
  repeat: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  repeatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
  },
  resetButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  audioButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  playlistContainer: {
    marginTop: 10,
    gap: 10,
  },
  playlistItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playlistTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
    textAlign: 'right',
  },
  playlistAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  audioText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
