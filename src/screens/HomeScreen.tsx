import React, {useContext, useEffect, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {
  Alert,
  FlatList,
  ImageBackground,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {audioAssets} from '../assets/audio';
import {Header, Section, Note} from '../components';
import {data} from '../data';
import {
  createRepeatCountsForItems,
  getRepeatItemKey,
  repeatContext,
  themeContext,
  themes,
} from '../store';

export const HomeScreen = () => {
  const listRef = useRef<FlatList<any>>(null);
  const [showNote, setShowNote] = useState<boolean>(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const isFocused = useIsFocused();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts, resetAllRepeats, resetRepeats} = useContext(repeatContext);
  const theme = themes[mode];
  const homeRepeatCounts = createRepeatCountsForItems(data, 'data');

  const toggleNote = () => setShowNote(!showNote);

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

  const onResetScreenPress = () => {
    Alert.alert('إعادة عدادات هذه الصفحة', 'سيتم إعادة جميع العدادات في هذه الصفحة إلى القيم الأصلية.', [
      {text: 'إلغاء', style: 'cancel'},
      {text: 'إعادة', style: 'destructive', onPress: () => resetRepeats(homeRepeatCounts)},
    ]);
  };

  const onResetAllPress = () => {
    Alert.alert('إعادة جميع العدادات', 'سيتم إعادة جميع العدادات في التطبيق إلى القيم الأصلية.', [
      {text: 'إلغاء', style: 'cancel'},
      {text: 'إعادة الكل', style: 'destructive', onPress: resetAllRepeats},
    ]);
  };

  const activeAudioSource = activeAudioFile ? audioAssets[activeAudioFile] : null;
  const resolvedActiveAudioUri = activeAudioSource
    ? Image.resolveAssetSource(activeAudioSource).uri
    : undefined;
  const onListScroll = (offsetY: number) => {
    const shouldShowSticky = offsetY > 170;
    const shouldShowScrollTop = shouldShowSticky && offsetY > 350;

    if (shouldShowSticky !== showStickyHeader) {
      setShowStickyHeader(shouldShowSticky);
    }

    if (shouldShowScrollTop !== showScrollTopButton) {
      setShowScrollTopButton(shouldShowScrollTop);
    }
  };

  const onScrollTopPress = () => {
    listRef.current?.scrollToOffset({animated: true, offset: 0});
  };

  return (
    <>
      {showNote && <Note />}
      <ImageBackground
        source={require('../assets/images/asfalt-dark.png')}
        style={[styles.background, {backgroundColor: theme.bg}]}
        imageStyle={styles.cover}>
        {showStickyHeader ? (
          <View style={styles.stickyHeaderWrapper}>
            <Header
              compact
              onResetAllPress={onResetAllPress}
              onResetScreenPress={onResetScreenPress}
              showResetActions
            />
          </View>
        ) : null}
        <FlatList
          ref={listRef}
          data={data}
          extraData={{activeAudioFile, isAudioPaused, repeatCounts}}
          keyExtractor={(item, index) => getRepeatItemKey(item, index, 'data')}
          onScroll={({nativeEvent}) => onListScroll(nativeEvent.contentOffset.y)}
          renderItem={({item, index}) => {
            const itemKey = getRepeatItemKey(item, index, 'data');

            return (
              <Section
                {...item}
                activeAudioFile={activeAudioFile}
                count={repeatCounts[itemKey] ?? item.repeat ?? 0}
                isAudioPaused={isAudioPaused}
                onPress={() => decrementRepeat(itemKey)}
                onReset={() => resetRepeats({[itemKey]: item.repeat ?? 0})}
                onAudioFilePress={onAudioPress}
              />
            );
          }}
          ListHeaderComponent={
            <Header
              onResetAllPress={onResetAllPress}
              onResetScreenPress={onResetScreenPress}
              showResetActions
            />
          }
          scrollEventThrottle={16}
        />
        {showScrollTopButton ? (
          <Pressable
            accessibilityHint="يعيدك إلى أعلى الصفحة"
            accessibilityLabel="العودة إلى الأعلى"
            accessibilityRole="button"
            onPress={onScrollTopPress}
            style={[styles.scrollTopButton, {backgroundColor: theme.activeBg}]}> 
            <Icon color={theme.secondaryColor} name="keyboard-double-arrow-up" size={22} />
          </Pressable>
        ) : null}
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
  stickyHeaderWrapper: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  scrollTopButton: {
    alignItems: 'center',
    borderRadius: 22,
    bottom: 75,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    width: 36,
    zIndex: 12,
  },
});
