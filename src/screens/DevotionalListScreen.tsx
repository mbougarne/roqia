import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {audioAssets} from '../assets/audio';
import {getPressableScaleStyle, Header, Section} from '../components';
import {type DataProps} from '../data';
import {
  type RepeatContextState,
  createRepeatCountsForItems,
  getRepeatItemKey,
  themeContext,
  themes,
} from '../store';

type DevotionalListScreenProps = {
  title: string;
  items: DataProps[];
  scope: string;
  repeatCtx: React.Context<RepeatContextState>;
};

export const DevotionalListScreen = ({items, scope, title, repeatCtx}: DevotionalListScreenProps) => {
  const listRef = useRef<FlatList<DataProps>>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts, resetAllRepeats, resetRepeats} = useContext(repeatCtx);
  const theme = themes[mode];
  const screenRepeatCounts = useMemo(() => createRepeatCountsForItems(items, scope), [items, scope]);

  const openDrawer = () => {
    navigation.openDrawer?.();
    navigation.getParent?.()?.openDrawer?.();
    navigation.getParent?.()?.getParent?.()?.openDrawer?.();
  };

  const onBackToHomePress = () => {
    navigation.navigate('MainTabs');
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

  const onResetScreenPress = () => {
    Alert.alert('إعادة عدادات هذه الصفحة', 'سيتم إعادة جميع العدادات في هذه الصفحة إلى القيم الأصلية.', [
      {text: 'إلغاء', style: 'cancel'},
      {text: 'إعادة', style: 'destructive', onPress: () => resetRepeats(screenRepeatCounts)},
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
    : activeAudioFile && Platform.OS === 'android'
      ? `asset:/${activeAudioFile}`
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
    <ImageBackground
      source={require('../assets/images/asfalt-dark.png')}
      style={[styles.background, {backgroundColor: theme.bg}]}
      imageStyle={styles.cover}>
      <View
        pointerEvents={showStickyHeader ? 'auto' : 'none'}
        style={[styles.stickyHeaderWrapper, !showStickyHeader && styles.stickyHeaderHidden]}>
        <Header
          compact
          onBackPress={onBackToHomePress}
          onMenuPress={openDrawer}
          onResetAllPress={onResetAllPress}
          onResetScreenPress={onResetScreenPress}
          showBackButton
          showMenuButton
          showResetActions
          title={title}
        />
      </View>
      <FlatList
        ref={listRef}
        data={items}
        extraData={{activeAudioFile, isAudioPaused, repeatCounts}}
        initialNumToRender={8}
        keyExtractor={(item, index) => getRepeatItemKey(item, index, scope)}
        maxToRenderPerBatch={8}
        onScroll={({nativeEvent}) => onListScroll(nativeEvent.contentOffset.y)}
        removeClippedSubviews
        renderItem={({item, index}) => {
          const itemKey = getRepeatItemKey(item, index, scope);

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
            onBackPress={onBackToHomePress}
            onMenuPress={openDrawer}
            onResetAllPress={onResetAllPress}
            onResetScreenPress={onResetScreenPress}
            showBackButton
            showMenuButton
            showResetActions
            title={title}
          />
        }
        scrollEventThrottle={16}
        updateCellsBatchingPeriod={60}
        windowSize={5}
      />
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
});
