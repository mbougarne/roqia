import React, {useContext, useEffect, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {
  FlatList,
  ImageBackground,
  Image,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';

import {audioAssets} from '../assets/audio';
import {Header, Section, Note} from '../components';
import {data} from '../data';
import {getRepeatItemKey, repeatContext, themeContext, themes} from '../store';

type AudioStatus = 'idle' | 'paused' | 'playing';

export const HomeScreen = () => {
  const [showNote, setShowNote] = useState<boolean>(false);
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const isFocused = useIsFocused();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts} = useContext(repeatContext);
  const theme = themes[mode];
  const icon = mode === 'light' ? 'nightlight-round' : 'sunny';
  const modeText = mode === 'light' ? 'وضع ليلي' : 'وضع نهاري';

  const toggleNote = () => setShowNote(!showNote);

  const getAudioStatus = (audioFile?: string): AudioStatus => {
    if (!audioFile || activeAudioFile !== audioFile) {
      return 'idle';
    }

    return isAudioPaused ? 'paused' : 'playing';
  };

  const onAudioPress = (audioFile: string) => {
    if (activeAudioFile === audioFile) {
      setIsAudioPaused(currentValue => !currentValue);
      return;
    }

    setActiveAudioFile(audioFile);
    setIsAudioPaused(false);
  };

  const onAudioFinished = () => {
    setActiveAudioFile(null);
    setIsAudioPaused(false);
  };

  useEffect(() => {
    if (!isFocused) {
      onAudioFinished();
    }
  }, [isFocused]);

  const activeAudioSource = activeAudioFile ? audioAssets[activeAudioFile] : null;
  const resolvedActiveAudioUri = activeAudioSource
    ? Image.resolveAssetSource(activeAudioSource).uri
    : undefined;

  return (
    <>
      {showNote && <Note />}
      <ImageBackground
        source={require('../assets/images/asfalt-dark.png')}
        style={[styles.background, {backgroundColor: theme.bg}]}
        imageStyle={styles.cover}>
        <FlatList
          data={data}
          extraData={{activeAudioFile, isAudioPaused, repeatCounts}}
          keyExtractor={(item, index) => getRepeatItemKey(item.content, index)}
          renderItem={({item, index}) => {
            const itemKey = getRepeatItemKey(item.content, index);

            return (
              <Section
                {...item}
                audioStatus={getAudioStatus(item.audioFile)}
                count={repeatCounts[itemKey] ?? item.repeat ?? 0}
                onPress={() => decrementRepeat(itemKey)}
                onAudioPress={
                  item.audioFile && audioAssets[item.audioFile]
                    ? () => onAudioPress(item.audioFile!)
                    : undefined
                }
              />
            );
          }}
          ListHeaderComponent={
            <Header icon={icon} modeText={modeText} />
          }
        />
        {resolvedActiveAudioUri ? (
          <Video
            ignoreSilentSwitch="ignore"
            onEnd={onAudioFinished}
            onError={onAudioFinished}
            paused={isAudioPaused}
            playInBackground={false}
            playWhenInactive={false}
            source={{uri: resolvedActiveAudioUri}}
            style={styles.hiddenPlayer}
          />
        ) : null}
      </ImageBackground>
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingBottom: 20,
  },
  cover: {
    resizeMode: 'repeat',
  },
  hiddenPlayer: {
    width: 0,
    height: 0,
  },
});
