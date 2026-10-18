import React, {useContext, useEffect, useRef} from 'react';
import {I18nManager, Pressable, View} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen, DuaaScreen, TasbihatScreen, AboutScreen} from '../screens';
import {AdkarMenuScreen, AdkarCategoryScreen} from '../screens/AdkarScreen';
import {
  MoreScreen,
  QuranScreen,
  PrayerScreen,
  SettingsScreen,
  RecoveryScreen,
} from '../screens/FoundationScreens';
import {
  DiscoveryScreen,
  ContentScreen,
} from '../features/devotional/DiscoveryScreens';
import {GuideScreen, GuidanceScreen} from '../screens/EducationScreens';
import {
  LegalScreen,
  SourcesScreen,
  ExternalLinkScreen,
} from '../screens/AboutScreen';
import {RemindersScreen} from '../features/settings/reminders/Screen';
import {StorageScreen, DownloadsScreen} from '../features/downloads/Screens';
import {MiniPlayer, PlayerScreen} from '../features/audio/Player';
import {AppIcon, AppText, usePalette, type IconName} from '../design/ui';
import {themeContext} from '../store';
import {consumeLinks} from './linkInbox';
import {resolveLink, type Tabs, type RootRoutes} from './routes';
const Tab = createBottomTabNavigator<Tabs>(),
  Stack = createNativeStackNavigator<RootRoutes>();
const labels: Record<keyof Tabs, {title: string; icon: IconName}> = {
  Home: {title: 'الرقية', icon: 'shield'},
  Adkar: {title: 'الأذكار', icon: 'sun'},
  Quran: {title: 'القرآن', icon: 'book'},
  Prayer: {title: 'الصلاة', icon: 'mosque'},
  More: {title: 'المزيد', icon: 'more'},
};
function TabBar({state, navigation: tabs}: BottomTabBarProps) {
  const p = usePalette();
  return (
    <View
      style={{
        backgroundColor: p.surface,
        borderTopWidth: 1,
        borderColor: p.borderSubtle,
      }}>
      <MiniPlayer onOpen={() => tabs.getParent()?.navigate('Player')} />
      <View style={{flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse'}}>
        {state.routes.map((route, index) => {
          const selected = state.index === index,
            meta = labels[route.name as keyof Tabs];
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={meta.title}
              accessibilityState={{selected}}
              onPress={() => {
                const e = tabs.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!e.defaultPrevented) tabs.navigate(route.name);
              }}
              style={{
                flex: 1,
                minHeight: 64,
                paddingVertical: 8,
                alignItems: 'center',
                gap: 4,
                backgroundColor: selected ? p.surfaceMuted : p.surface,
              }}>
              <AppIcon
                name={meta.icon}
                color={selected ? p.iconPrimary : p.textSecondary}
              />
              <AppText
                role="tabLabel"
                style={{
                  textAlign: 'center',
                  width: '100%',
                  color: selected ? p.textPrimary : p.textSecondary,
                }}>
                {meta.title}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Adkar"
        component={AdkarMenuScreen as React.ComponentType<any>}
      />
      <Tab.Screen name="Quran" component={QuranScreen} />
      <Tab.Screen name="Prayer" component={PrayerScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
function withPlayer(Component: React.ComponentType<any>) {
  return function Detail(props: any) {
    return (
      <View style={{flex: 1}}>
        <View style={{flex: 1}}>
          <Component {...props} />
        </View>
        <MiniPlayer onOpen={() => props.navigation.navigate('Player')} />
      </View>
    );
  };
}
const details = {
  Bookmarks: withPlayer(DiscoveryScreen),
  Search: withPlayer(DiscoveryScreen),
  Content: withPlayer(ContentScreen),
  Guide: withPlayer(GuideScreen),
  Guidance: withPlayer(GuidanceScreen),
  Privacy: withPlayer(LegalScreen),
  Terms: withPlayer(LegalScreen),
  Sources: withPlayer(SourcesScreen),
  ExternalLink: withPlayer(ExternalLinkScreen),
  Reminders: withPlayer(RemindersScreen),
  Morning: withPlayer(AdkarCategoryScreen),
  Night: withPlayer(AdkarCategoryScreen),
  BeforeSleep: withPlayer(AdkarCategoryScreen),
  Duaa: withPlayer(DuaaScreen),
  Tasbihat: withPlayer(TasbihatScreen),
  About: withPlayer(AboutScreen),
  Settings: withPlayer(SettingsScreen),
  Downloads: withPlayer(DownloadsScreen),
  Storage: withPlayer(StorageScreen),
  Recovery: withPlayer(RecoveryScreen),
};
export function MainTabNavigation() {
  const navigation = useNavigationContainerRef<RootRoutes>();
  const {mode} = useContext(themeContext),
    p = usePalette(),
    unsubscribe = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => unsubscribe.current?.(), []);
  return (
    <NavigationContainer
      ref={navigation}
      theme={{
        ...DefaultTheme,
        dark: mode === 'dark',
        colors: {
          ...DefaultTheme.colors,
          background: p.background,
          card: p.surface,
          text: p.textPrimary,
          primary: p.actionPrimary,
          border: p.borderSubtle,
        },
      }}
      onReady={() => {
        unsubscribe.current = consumeLinks(url => {
          if (!navigation.isReady()) return false;
          const target = resolveLink(url);
          if ('tab' in target)
            navigation.navigate('MainTabs', {screen: target.tab});
          else if ('recovery' in target)
            navigation.navigate('Recovery', {reason: target.recovery});
          else navigation.navigate(target.screen);
          return true;
        });
      }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: p.background},
          animation: 'none',
        }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Bookmarks" component={details.Bookmarks} />
        <Stack.Screen name="Search" component={details.Search} />
        <Stack.Screen name="Content" component={details.Content} />
        <Stack.Screen name="Guide" component={details.Guide} />
        <Stack.Screen name="Guidance" component={details.Guidance} />
        <Stack.Screen name="Privacy" component={details.Privacy} />
        <Stack.Screen name="Terms" component={details.Terms} />
        <Stack.Screen name="Sources" component={details.Sources} />
        <Stack.Screen name="ExternalLink" component={details.ExternalLink} />
        <Stack.Screen name="Reminders" component={details.Reminders} />
        <Stack.Screen name="Morning" component={details.Morning} />
        <Stack.Screen name="Night" component={details.Night} />
        <Stack.Screen name="BeforeSleep" component={details.BeforeSleep} />
        <Stack.Screen name="Duaa" component={details.Duaa} />
        <Stack.Screen name="Tasbihat" component={details.Tasbihat} />
        <Stack.Screen name="About" component={details.About} />
        <Stack.Screen name="Settings" component={details.Settings} />
        <Stack.Screen name="Downloads" component={details.Downloads} />
        <Stack.Screen name="Storage" component={details.Storage} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="Recovery" component={details.Recovery} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
