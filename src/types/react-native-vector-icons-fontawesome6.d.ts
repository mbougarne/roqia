declare module 'react-native-vector-icons/FontAwesome6' {
  import * as React from 'react';
  import {TextProps} from 'react-native';

  export type FontAwesomeIconName = string;

  export interface FontAwesomeProps extends TextProps {
    name: FontAwesomeIconName;
    size?: number;
    color?: string;
  }

  const FontAwesomeIcons: React.ComponentType<FontAwesomeProps>;
  export default FontAwesomeIcons;
}