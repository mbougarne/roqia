import React, {useContext} from 'react';
import {View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import assets from './illustrations.json';
import {artwork} from './artwork';
import {usePalette} from './ui';
import {themeContext} from '../store';
export function Illustration({
  name,
  height = 160,
}: {
  name: keyof typeof assets.light;
  height?: number;
}) {
  const {mode} = useContext(themeContext);
  const p = usePalette();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{alignItems: 'center'}}>
      <SvgXml
        xml={artwork(name, p, mode === 'dark') ?? assets[mode][name]}
        width="100%"
        height={height}
        accessible={false}
      />
    </View>
  );
}
