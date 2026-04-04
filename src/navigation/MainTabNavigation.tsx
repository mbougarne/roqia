import React, {useContext} from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {AboutScreen, HomeScreen, MoreScreen} from '../screens';
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
          tabBarIcon: ({color, size}) => {
            const iconByRoute = {
              Home: 'home',
              About: 'info-outline',
              More: 'more-vert',
            } as const;

            const iconName = iconByRoute[route.name as keyof typeof iconByRoute] ?? 'home';
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.tertiaryColor,
          tabBarInactiveTintColor: theme.color,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopColor: theme.color,
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
            position: 'absolute',
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
          options={{tabBarLabel: 'الرقية'}}
        />
        <Tab.Screen
          name="About"
          component={AboutScreen}
          options={{tabBarLabel: 'عن التطبيق'}}
        />
        <Tab.Screen
          name="More"
          component={MoreScreen}
          options={{tabBarLabel: 'المزيد'}}
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
