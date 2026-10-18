import React, {useContext, useRef, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {getPressableScaleStyle, Header, Section, Note} from '../components';
import {data} from '../data';
import {useHomeAudioPlayback} from '../hooks/useHomeAudioPlayback';
import {
  createRepeatCountsForItems,
  getRepeatItemKey,
  homeRepeatContext,
  themeContext,
  themes,
} from '../store';

export const HomeScreen = () => {
  const listRef = useRef<FlatList<any>>(null);
  const [showNote] = useState<boolean>(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const navigation = useNavigation<any>();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts, resetAllRepeats, resetRepeats} =
    useContext(homeRepeatContext);
  const theme = themes[mode];
  const homeRepeatCounts = createRepeatCountsForItems(data, 'data');
  const {activeAudioFile, isAudioPaused, onAudioPress, onPlayAllPress} =
    useHomeAudioPlayback(data);

  const onResetScreenPress = () => {
    Alert.alert(
      'إعادة عدادات هذه الصفحة',
      'سيتم إعادة جميع العدادات في هذه الصفحة إلى القيم الأصلية.',
      [
        {text: 'إلغاء', style: 'cancel'},
        {
          text: 'إعادة',
          style: 'destructive',
          onPress: () => resetRepeats(homeRepeatCounts),
        },
      ],
    );
  };

  const onResetAllPress = () => {
    Alert.alert(
      'إعادة جميع العدادات',
      'سيتم إعادة جميع العدادات في التطبيق إلى القيم الأصلية.',
      [
        {text: 'إلغاء', style: 'cancel'},
        {text: 'إعادة الكل', style: 'destructive', onPress: resetAllRepeats},
      ],
    );
  };

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
    navigation.navigate('MainTabs', {screen: 'More'});
  };

  return (
    <>
      {showNote && <Note />}
      <ImageBackground
        source={require('../assets/images/asfalt-dark.png')}
        style={[styles.background, {backgroundColor: theme.bg}]}
        imageStyle={styles.cover}>
        <View
          importantForAccessibility={
            showStickyHeader ? 'auto' : 'no-hide-descendants'
          }
          accessibilityElementsHidden={!showStickyHeader}
          pointerEvents={showStickyHeader ? 'auto' : 'none'}
          style={[
            styles.stickyHeaderWrapper,
            !showStickyHeader && styles.stickyHeaderHidden,
          ]}>
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
          onScroll={({nativeEvent}) =>
            onListScroll(nativeEvent.contentOffset.y)
          }
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
        <Pressable
          accessibilityLabel="تشغيل جميع المقاطع"
          accessibilityRole="button"
          onPress={onPlayAllPress}
          style={[styles.playAllButton, {backgroundColor: theme.activeBg}]}>
          <Icon name="play-arrow" color={theme.secondaryColor} size={24} />
        </Pressable>
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
            <Icon
              color={theme.secondaryColor}
              name="keyboard-double-arrow-up"
              size={22}
            />
          </Pressable>
        ) : null}
      </ImageBackground>
    </>
  );
};

const styles = StyleSheet.create({
  stickyHeaderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
  },
  stickyHeaderHidden: {opacity: 0},
  background: {
    flex: 1,
    paddingBottom: 20,
  },
  cover: {
    resizeMode: 'repeat',
  },
  scrollTopButton: {
    alignItems: 'center',
    borderRadius: 22,
    bottom: 75,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    width: 48,
    zIndex: 12,
  },
  playAllButton: {
    alignItems: 'center',
    borderRadius: 22,
    bottom: 75,
    height: 48,
    justifyContent: 'center',
    left: 5,
    position: 'absolute',
    width: 48,
    zIndex: 12,
  },
});
