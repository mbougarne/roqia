import React, {useContext} from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome6';

import {AboutScreen, HomeScreen, AdkarScreen} from '../screens';
import {themeContext, themes} from '../store';

const Tab = createBottomTabNavigator();

export const MainTabNavigation = () => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
      card: 'transparent',
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
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
              About: 'ellipsis',
              Adkar: 'clock',
              Duaa: 'hands-holding',
              Tasbihat: 'spinner',
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
            fontWeight: '600',
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
            tabBarAccessibilityLabel: 'تبويب الأذكار',
            tabBarLabel: 'أذكار',
          }}
        />
        <Tab.Screen
          name="Duaa"
          component={() => null}
          options={{
            tabBarAccessibilityLabel: 'تبويب الأذعية',
            tabBarLabel: 'أذعية',
          }}
        />
        <Tab.Screen
          name="Tasbihat"
          component={() => null}
          options={{
            tabBarAccessibilityLabel: 'تبويب التسبيحات',
            tabBarLabel: 'تسبيحات',
          }}
        />
        <Tab.Screen
          name="About"
          component={AboutScreen}
          options={{
            tabBarAccessibilityLabel: 'تبويب نبذة',
            tabBarLabel: 'نبذة',
          }}
        />
      </Tab.Navigator>
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
