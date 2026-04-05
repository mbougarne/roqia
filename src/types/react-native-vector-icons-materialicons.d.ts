declare module 'react-native-vector-icons/MaterialIcons' {
  import * as React from 'react';
  import {TextProps} from 'react-native';

  export type MaterialIconName = string;

  export interface MaterialIconsProps extends TextProps {
    name: MaterialIconName;
    size?: number;
    color?: string;
  }

  const MaterialIcons: React.ComponentType<MaterialIconsProps>;
  export default MaterialIcons;
}