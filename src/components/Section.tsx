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
  audioStatus?: AudioStatus;
  count: number;
  onPress: () => void;
  onAudioPress?: () => void;
};

export const Section: FC<SectionProp> = item => {
  const {mode} = useContext<ContextState>(themeContext);
  const isDone = item.count === 0;
  const theme = themes[mode];
  const isPlaying = item.audioStatus === 'playing';
  const canPlayAudio = !!item.audioFile && !!item.onAudioPress;

  const onCopy = () => {
    Clipboard.setString(item.content!);
  };

  const onCopyPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onCopy();
  };

  const onAudioButtonPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    item.onAudioPress?.();
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
            <StyledText
              customStyle={[
                styles.content,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.content}
            </StyledText>
            <StyledText
              customStyle={[
                styles.caption,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.caption}
            </StyledText>
            <StyledText
              customStyle={[
                styles.repeat,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.repeatDescription}
            </StyledText>
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
                    name={isPlaying ? 'pause' : 'play-arrow'}
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
                    {isPlaying ? 'إيقاف' : 'إستمع'}
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
  audioText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
