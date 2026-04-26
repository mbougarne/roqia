import React, {useContext, useEffect, useRef, useState} from 'react';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {getPressableScaleStyle, Header, Section, Note, StyledText} from '../components';
import {data} from '../data';
import {useHomeAudioPlayback} from '../hooks/useHomeAudioPlayback';
import {
  createRepeatCountsForItems,
  getRepeatItemKey,
  homeRepeatContext,
  themeContext,
  themes,
} from '../store';

const waveformHeights = [
  12, 20, 15, 24, 18, 28, 16,
  22, 14, 26, 19, 12, 12, 20,
  15, 24, 18, 28, 16, 22, 14,
  26, 19, 12, 18, 28, 16, 22,
  22, 14, 26, 19, 12, 18, 28,
  20, 15, 18, 22
];

export const HomeScreen = () => {
  const listRef = useRef<FlatList<any>>(null);
  const [showNote, setShowNote] = useState<boolean>(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts, resetAllRepeats, resetRepeats} = useContext(homeRepeatContext);
  const theme = themes[mode];
  const homeRepeatCounts = createRepeatCountsForItems(data, 'data');
  const {
    activeAudioFile,
    isAudioPaused,
    isPlaylistActive,
    onAudioPress,
    onPlayAllPress,
    stopPlayback,
    togglePlayback,
  } = useHomeAudioPlayback(data);

  const toggleNote = () => setShowNote(!showNote);

  useEffect(() => {
    if (!isFocused) {
      stopPlayback();
    }
  }, [isFocused, stopPlayback]);

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

  const activeAudioItem = activeAudioFile ? data.find(item => item.audioFile === activeAudioFile) : undefined;
  const isPlayerVisible = Boolean(activeAudioFile && !isAudioPaused);
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

  const onMenuPress = () => {
    navigation.openDrawer?.();
    navigation.getParent?.()?.openDrawer?.();
    navigation.getParent?.()?.getParent?.()?.openDrawer?.();
  };

  return (
    <>
      {showNote && <Note />}
      <ImageBackground
        source={require('../assets/images/asfalt-dark.png')}
        style={[styles.background, {backgroundColor: theme.bg}]}
        imageStyle={styles.cover}>
        <View
          pointerEvents={showStickyHeader ? 'auto' : 'none'}
          style={[styles.stickyHeaderWrapper, !showStickyHeader && styles.stickyHeaderHidden]}>
          <Header
            compact
            onMenuPress={onMenuPress}
            onResetAllPress={onResetAllPress}
            onResetScreenPress={onResetScreenPress}
            showMenuButton
            showResetActions
          />
        </View>
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
              onMenuPress={onMenuPress}
              onResetAllPress={onResetAllPress}
              onResetScreenPress={onResetScreenPress}
              showMenuButton
              showResetActions
            />
          }
          scrollEventThrottle={16}
        />
        {!isPlayerVisible ? (
          <Pressable
            accessibilityHint="يشغل جميع المقاطع الصوتية في الصفحة ويكرر كل مقطع حسب عدده"
            accessibilityLabel={isPlaylistActive && isAudioPaused ? 'متابعة تشغيل جميع المقاطع' : 'تشغيل جميع المقاطع'}
            accessibilityRole="button"
            onPress={onPlayAllPress}
            style={({pressed}) => [
              styles.playAllButton,
              {backgroundColor: theme.activeBg},
              getPressableScaleStyle(pressed, 0.9, 0.94),
            ]}>
            <Icon color={theme.secondaryColor} name="play-arrow" size={22} />
          </Pressable>
        ) : null}
        {isPlayerVisible ? (
          <View
            style={[
              styles.playerTray,
              {
                backgroundColor: theme.secondaryBg,
                top: showStickyHeader ? 70 : 80,
              },
            ]}> 
            <View style={styles.playerContent}>
              <View style={styles.playerMeta}>
                <View style={styles.playerTitleRow}>
                  <StyledText customStyle={[styles.playerTitle, {color: theme.tertiaryColor}]}> 
                    {activeAudioItem?.caption ?? 'تشغيل الرقية'}
                  </StyledText>
                  <StyledText customStyle={[styles.playerSubtitle, {color: theme.color}]}> 
                    {isPlaylistActive ? 'تشغيل متتال' : 'تشغيل صوتي'}
                  </StyledText>
                </View>
                <View style={styles.waveformRow}>
                  {waveformHeights.map((height, index) => (
                    <View
                      key={`${height}-${index}`}
                      style={[
                        styles.waveBar,
                        {
                          backgroundColor:
                            !isAudioPaused && index % 3 !== 0 ? theme.tertiaryColor : theme.activeBg,
                          height,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Pressable
                accessibilityHint="يشغل أو يوقف الصوت الحالي"
                accessibilityLabel={isAudioPaused ? 'متابعة الصوت' : 'إيقاف الصوت مؤقتا'}
                accessibilityRole="button"
                onPress={togglePlayback}
                style={({pressed}) => [
                  styles.playerButton,
                  {backgroundColor: theme.activeBg},
                  getPressableScaleStyle(pressed, 0.9, 0.94),
                ]}>
                <Icon
                  color={theme.secondaryColor}
                  name={isAudioPaused ? 'play-arrow' : 'pause'}
                  size={24}
                />
              </Pressable>
            </View>
          </View>
        ) : null}
        {showScrollTopButton ? (
          <Pressable
            accessibilityHint="يعيدك إلى أعلى الصفحة"
            accessibilityLabel="العودة إلى الأعلى"
            accessibilityRole="button"
            onPress={onScrollTopPress}
            style={({pressed}) => [
              styles.scrollTopButton,
              {backgroundColor: theme.activeBg},
              getPressableScaleStyle(pressed, 0.9, 0.94),
            ]}> 
            <Icon color={theme.secondaryColor} name="keyboard-double-arrow-up" size={22} />
          </Pressable>
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
  playerTray: {
    alignItems: 'center',
    borderRadius: 0,
    left: 0,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
    position: 'absolute',
    right: 0,
    zIndex: 11,
  },
  playerContent: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 12,
    width: '100%',
  },
  playerMeta: {
    flex: 1,
    gap: 8,
  },
  playerTitleRow: {
    alignItems: 'flex-end',
    gap: 2,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  playerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  waveformRow: {
    alignItems: 'flex-end',
    flexDirection: 'row-reverse',
    gap: 4,
    height: 30,
  },
  waveBar: {
    borderRadius: 999,
    width: 4,
  },
  playerButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stickyHeaderWrapper: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  stickyHeaderHidden: {
    opacity: 0,
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
  playAllButton: {
    alignItems: 'center',
    borderRadius: 22,
    bottom: 75,
    height: 36,
    justifyContent: 'center',
    left: 5,
    position: 'absolute',
    width: 36,
    zIndex: 12,
  },
});
