import React, {useContext, useEffect, useRef, useState} from 'react';
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
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {type RouteProp, useIsFocused} from '@react-navigation/native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {audioAssets} from '../assets/audio';
import {adkarData} from '../data';
import {getPressableScaleStyle, Header, Section, StyledText} from '../components';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
import {
  adkarRepeatContext,
  getRepeatItemKey,
  themeContext,
  themes,
} from '../store';

type AdkarStackParamList = {
  AdkarHome: undefined;
  Morning: undefined;
  Night: undefined;
  BeforeSleep: undefined;
};

type AdkarCategoryRouteName = Exclude<keyof AdkarStackParamList, 'AdkarHome'>;
type AdkarCategoryScreenProps = {
  navigation: NativeStackNavigationProp<AdkarStackParamList, AdkarCategoryRouteName>;
  route: RouteProp<AdkarStackParamList, AdkarCategoryRouteName>;
};
type AdkarMenuScreenProps = {
  navigation: NativeStackNavigationProp<AdkarStackParamList, 'AdkarHome'>;
};
const Stack = createNativeStackNavigator<AdkarStackParamList>();

const categoryConfig: Record<AdkarCategoryRouteName, {icon: string; title: string}> = {
  Morning: {
    icon: 'wb-sunny',
    title: 'أذكار الصباح',
  },
  Night: {
    icon: 'dark-mode',
    title: 'أذكار المساء',
  },
  BeforeSleep: {
    icon: 'hotel',
    title: 'أذكار قبل النوم',
  },
};

const AdkarMenuScreen = ({navigation}: AdkarMenuScreenProps) => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];
  const onMenuPress = () => {
    (navigation as any).openDrawer?.();
    (navigation as any).getParent?.()?.openDrawer?.();
    (navigation as any).getParent?.()?.getParent?.()?.openDrawer?.();
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}> 
      <Header onMenuPress={onMenuPress} showMenuButton title="أذكار اليوم" />
      <View style={styles.menuContainer}>
        {(Object.keys(categoryConfig) as AdkarCategoryRouteName[]).map(routeName => {
          const config = categoryConfig[routeName];

          return (
            <Pressable
              accessibilityHint={`يفتح صفحة ${config.title}`}
              accessibilityLabel={config.title}
              accessibilityRole="button"
              key={routeName}
              onPress={() => navigation.navigate(routeName)}
              style={({pressed}) => [
                styles.menuButtonWrapper,
                getPressableScaleStyle(pressed, 0.9, 0.98),
              ]}>
              <ImageBackground
                source={require('../assets/images/arabesque.png')}
                style={[styles.menuButton, {backgroundColor: theme.secondaryBg}]}
                imageStyle={[
                  styles.menuButtonBackground,
                  mode === 'dark' && styles.darkMenuButtonBackground,
                ]}>
                <Icon color={theme.tertiaryColor} name={config.icon} size={34} />
                <StyledText
                  customStyle={[styles.menuButtonText, {color: theme.tertiaryColor}]}> 
                  {config.title}
                </StyledText>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const AdkarCategoryScreen = ({navigation, route}: AdkarCategoryScreenProps) => {
  const listRef = useRef<FlatList<any>>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const isFocused = useIsFocused();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts, resetAllRepeats, resetRepeats} = useContext(adkarRepeatContext);
  const theme = themes[mode];
  const filteredEntries = adkarData.reduce<Array<{item: (typeof adkarData)[number]; index: number}>>(
    (acc, item, index) => {
      if (item.category === route.name) {
        acc.push({item, index});
      }

      return acc;
    },
    [],
  );
  const categoryRepeatCounts = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[getRepeatItemKey(entry.item, entry.index, 'adkar')] = entry.item.repeat ?? 0;
    return acc;
  }, {});
  const {
    activeAudioFile,
    isAudioPaused,
    onAudioFinished,
    onAudioPress,
    playbackInstanceId,
    stopPlayback,
  } = useScreenAudioPlayback(filteredEntries.map(entry => entry.item));

  useEffect(() => {
    if (!isFocused) {
      stopPlayback();
    }
  }, [isFocused, stopPlayback]);

  const onResetScreenPress = () => {
    Alert.alert('إعادة عدادات هذه الصفحة', 'سيتم إعادة جميع العدادات في هذا القسم إلى القيم الأصلية.', [
      {text: 'إلغاء', style: 'cancel'},
      {text: 'إعادة', style: 'destructive', onPress: () => resetRepeats(categoryRepeatCounts)},
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
      style={[styles.container, {backgroundColor: theme.bg}]}
      imageStyle={styles.cover}>
      <View
        pointerEvents={showStickyHeader ? 'auto' : 'none'}
        style={[styles.stickyHeaderWrapper, !showStickyHeader && styles.stickyHeaderHidden]}>
        <Header
          compact
          onBackPress={navigation.goBack}
          onResetAllPress={onResetAllPress}
          onResetScreenPress={onResetScreenPress}
          showBackButton
          showResetActions
          title={categoryConfig[route.name].title}
        />
      </View>
      <FlatList
        ref={listRef}
        data={filteredEntries}
        contentContainerStyle={styles.categoryListContent}
        extraData={{activeAudioFile, isAudioPaused, repeatCounts}}
        keyExtractor={({item, index}) => getRepeatItemKey(item, index, 'adkar')}
        onScroll={({nativeEvent}) => onListScroll(nativeEvent.contentOffset.y)}
        renderItem={({item: entry}) => {
          const itemKey = getRepeatItemKey(entry.item, entry.index, 'adkar');

          return (
            <Section
              {...entry.item}
              activeAudioFile={activeAudioFile}
              count={repeatCounts[itemKey] ?? entry.item.repeat ?? 0}
              isAudioPaused={isAudioPaused}
              onPress={() => decrementRepeat(itemKey)}
              onReset={() => resetRepeats({[itemKey]: entry.item.repeat ?? 0})}
              onAudioFilePress={onAudioPress}
            />
          );
        }}
        ListHeaderComponent={
          <Header
            onBackPress={navigation.goBack}
            onResetAllPress={onResetAllPress}
            onResetScreenPress={onResetScreenPress}
            showBackButton
            showResetActions
            title={categoryConfig[route.name].title}
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
          key={`${activeAudioFile}-${playbackInstanceId}`}
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

export const AdkarScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: 'transparent'},
        headerShown: false,
      }}>
      <Stack.Screen component={AdkarMenuScreen} name="AdkarHome" />
      <Stack.Screen component={AdkarCategoryScreen} name="Morning" />
      <Stack.Screen component={AdkarCategoryScreen} name="Night" />
      <Stack.Screen component={AdkarCategoryScreen} name="BeforeSleep" />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cover: {
    resizeMode: 'repeat',
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 90,
  },
  menuButtonWrapper: {
    marginBottom: 24,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 18,
    minHeight: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  menuButtonBackground: {
    resizeMode: 'repeat',
  },
  darkMenuButtonBackground: {
    opacity: 0.22,
  },
  menuButtonText: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  categoryListContent: {
    paddingBottom: 50,
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
