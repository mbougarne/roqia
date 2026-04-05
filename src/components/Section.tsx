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
import {type ContextState, themeContext, themes} from '../store';
import {StyledText} from './StyledText';

type AudioStatus = 'idle' | 'paused' | 'playing';

type SectionProp = DataProps & {
  activeAudioFile?: string | null;
  isAudioPaused?: boolean;
  count: number;
  onPress: () => void;
  onAudioFilePress?: (fileName: string) => void;
};

export const Section: FC<SectionProp> = item => {
  const {mode} = useContext<ContextState>(themeContext);
  const isDone = item.count === 0;
  const theme = themes[mode];
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
          {backgroundColor: isDone ? theme.activeBg : theme.bg},
        ]}
        imageStyle={styles.backgroundStyle}>
        <Pressable onPress={item.onPress} style={styles.container}>
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
                      key={audioItem.fileName}
                      onPress={event =>
                        onPlaylistAudioPress(event, audioItem.fileName)
                      }
                      style={styles.playlistItem}>
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
              <StyledText
                customStyle={[
                  styles.repeatNumber,
                  {
                    color: isDone ? theme.secondaryColor : theme.tertiaryColor,
                  },
                ]}>
                {item.count}
              </StyledText>
            </View>
            <View style={styles.bottomItem}>
              {canPlayAudio ? (
                <Pressable onPress={onAudioButtonPress} style={styles.audioButton}>
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
              <Pressable onPress={onCopyPress}>
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
  audioButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
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
