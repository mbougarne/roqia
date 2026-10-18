import React, {useContext, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {type RouteProp} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {adkarData} from '../data';
import {Page, Row} from '../design/ui';
import {getPressableScaleStyle, Header, Section} from '../components';
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
  navigation: NativeStackNavigationProp<
    AdkarStackParamList,
    AdkarCategoryRouteName
  >;
  route: RouteProp<AdkarStackParamList, AdkarCategoryRouteName>;
};
type AdkarMenuScreenProps = {
  navigation: NativeStackNavigationProp<AdkarStackParamList, 'AdkarHome'>;
};
const Stack = createNativeStackNavigator<AdkarStackParamList>();

const categoryConfig: Record<
  AdkarCategoryRouteName,
  {icon: string; title: string}
> = {
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

export const AdkarMenuScreen = ({navigation}: AdkarMenuScreenProps) => (
  <Page title="أذكار اليوم">
    <Row
      title="أذكار الصباح"
      icon="sun"
      onPress={() => navigation.navigate('Morning')}
    />
    <Row
      title="أذكار المساء"
      icon="moon"
      onPress={() => navigation.navigate('Night')}
    />
    <Row
      title="أذكار قبل النوم"
      icon="bed"
      onPress={() => navigation.navigate('BeforeSleep')}
    />
  </Page>
);

export const AdkarCategoryScreen = ({
  navigation,
  route,
}: AdkarCategoryScreenProps) => {
  const listRef = useRef<FlatList<any>>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts, resetAllRepeats, resetRepeats} =
    useContext(adkarRepeatContext);
  const theme = themes[mode];
  const filteredEntries = adkarData.reduce<
    Array<{item: (typeof adkarData)[number]; index: number}>
  >((acc, item, index) => {
    if (item.category === route.name) {
      acc.push({item, index});
    }

    return acc;
  }, []);
  const categoryRepeatCounts = filteredEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      acc[getRepeatItemKey(entry.item, entry.index, 'adkar')] =
        entry.item.repeat ?? 0;
      return acc;
    },
    {},
  );
  const {activeAudioFile, isAudioPaused, onAudioPress} = useScreenAudioPlayback(
    filteredEntries.map(entry => entry.item),
  );

  const onResetScreenPress = () => {
    Alert.alert(
      'إعادة عدادات هذه الصفحة',
      'سيتم إعادة جميع العدادات في هذا القسم إلى القيم الأصلية.',
      [
        {text: 'إلغاء', style: 'cancel'},
        {
          text: 'إعادة',
          style: 'destructive',
          onPress: () => resetRepeats(categoryRepeatCounts),
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

  return (
    <ImageBackground
      source={require('../assets/images/asfalt-dark.png')}
      style={[styles.container, {backgroundColor: theme.bg}]}
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
          <Icon
            color={theme.secondaryColor}
            name="keyboard-double-arrow-up"
            size={22}
          />
        </Pressable>
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
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    width: 48,
    zIndex: 12,
  },
});
