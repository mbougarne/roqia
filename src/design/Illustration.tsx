import React, {useContext} from 'react';
import {View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import assets from './illustrations.json';
import {themeContext} from '../store';
export function Illustration({
  name,
  height = 160,
}: {
  name: keyof typeof assets.light;
  height?: number;
}) {
  const {mode} = useContext(themeContext);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{alignItems: 'center'}}>
      <SvgXml
        xml={assets[mode][name]}
        width="100%"
        height={height}
        accessible={false}
      />
    </View>
  );
}
