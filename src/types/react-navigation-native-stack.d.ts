declare module '@react-navigation/native-stack' {
  import * as React from 'react';

  export type NativeStackNavigationProp<
    ParamList extends Record<string, object | undefined>,
    RouteName extends keyof ParamList = keyof ParamList,
  > = {
    navigate: (screen: keyof ParamList) => void;
    goBack: () => void;
  };

  export function createNativeStackNavigator<
    ParamList extends Record<string, object | undefined>,
  >(): {
    Navigator: React.ComponentType<{
      children?: React.ReactNode;
      screenOptions?: Record<string, unknown>;
    }>;
    Screen: React.ComponentType<{
      name: keyof ParamList;
      component: React.ComponentType<any>;
    }>;
  };
}