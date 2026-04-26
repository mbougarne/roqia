import React, {useContext} from 'react';
import {ImageBackground, Linking, StyleSheet} from 'react-native';
import {DefaultTheme, NavigationContainer, type LinkingOptions} from '@react-navigation/native';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/FontAwesome6';

import {AboutScreen, HomeScreen, AdkarScreen, DuaaScreen, TasbihatScreen} from '../screens';
import {themeContext, themes} from '../store';
import {getInitialNotificationDeepLink, subscribeToNotificationDeepLinks} from '../services/notifications';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const linking: LinkingOptions<any> = {
  prefixes: ['roqia://'],
  async getInitialURL() {
    const initialUrl = await Linking.getInitialURL();

    if (initialUrl) {
      return initialUrl;
    }

    return getInitialNotificationDeepLink();
  },
  subscribe(listener) {
    const linkingSubscription = Linking.addEventListener('url', ({url}) => {
      listener(url);
    });
    const unsubscribeNotifee = subscribeToNotificationDeepLinks(listener);

    return () => {
      linkingSubscription.remove();
      unsubscribeNotifee();
    };
  },
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: {
            path: 'home',
          },
          Adkar: {
            path: 'adkar',
            screens: {
              AdkarHome: '',
              Morning: 'morning',
              Night: 'night',
              BeforeSleep: 'before-sleep',
            },
          },
        },
      },
      DuaaDrawer: 'duaa',
      TasbihatDrawer: 'tasbihat',
      AboutDrawer: 'about',
    },
  },
};

const MainTabs = () => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        sceneStyle: {
          backgroundColor: 'transparent',
        },
        tabBarPressColor:
          mode === 'dark' ? 'rgba(184, 195, 182, 0.16)' : 'rgba(26, 77, 46, 0.12)',
        tabBarIcon: ({color, size}) => {
          const iconByRoute = {
            Home: 'book-quran',
            Adkar: 'clock',
          } as const;

          const iconName = iconByRoute[route.name as keyof typeof iconByRoute] ?? 'home';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tertiaryColor,
        tabBarInactiveTintColor: theme.color,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          position: 'absolute',
          elevation: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowRadius: 0,
        },
        tabBarBackground: () => (
          <ImageBackground
            source={require('../assets/images/arabesque.png')}
            style={[styles.tabBackground, {backgroundColor: theme.secondaryBg}]}
            imageStyle={styles.tabBackgroundImage}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'NotoSansArabic',
          fontWeight: '700',
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: 'تبويب الرقية',
          tabBarLabel: 'الرقية',
        }}
      />
      <Tab.Screen
        name="Adkar"
        component={AdkarScreen}
        options={{
          popToTopOnBlur: true,
          tabBarAccessibilityLabel: 'تبويب الأذكار',
          tabBarLabel: 'أذكار',
        }}
      />
    </Tab.Navigator>
  );
};

export const MainTabNavigation = () => {
  const {mode} = useContext(themeContext);
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
      card: 'transparent',
    },
  };

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      <Drawer.Navigator
        screenOptions={{
          drawerPosition: 'right',
          drawerType: 'slide',
          headerShown: false,
          drawerActiveTintColor: themes[mode].tertiaryColor,
          drawerInactiveTintColor: themes[mode].color,
          drawerStyle: {
            width: '50%',
            backgroundColor: themes[mode].secondaryBg,
          },
          drawerLabelStyle: {
            fontFamily: 'NotoSansArabic',
            fontSize: 12,
            fontWeight: '700',
            color: themes[mode].tertiaryColor,
          },
          drawerItemStyle: {
            borderRadius: 10,
            marginHorizontal: 0,
          },
          overlayColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.22)',
        }}>
        <Drawer.Screen
          component={MainTabs}
          name="MainTabs"
          options={{
            drawerItemStyle: {display: 'none'},
            swipeEdgeWidth: 24,
          }}
        />
        <Drawer.Screen
          component={DuaaScreen}
          name="DuaaDrawer"
          options={{
            drawerLabel: 'الأدعية',
            drawerIcon: ({size}) => <Icon color={themes[mode].tertiaryColor} name="hands-holding" size={size} />,
            title: 'الأدعية',
          }}
        />
        <Drawer.Screen
          component={TasbihatScreen}
          name="TasbihatDrawer"
          options={{
            drawerLabel: 'التسبيحات',
            drawerIcon: ({size}) => <Icon color={themes[mode].tertiaryColor} name="spinner" size={size} />,
            title: 'التسبيحات',
          }}
        />
        <Drawer.Screen
          component={AboutScreen}
          name="AboutDrawer"
          options={{
            drawerLabel: 'نبذة',
            drawerIcon: ({size}) => <Icon color={themes[mode].tertiaryColor} name="ellipsis" size={size} />,
            title: 'نبذة',
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBackground: {
    flex: 1,
  },
  tabBackgroundImage: {
    resizeMode: 'repeat',
  },
});
