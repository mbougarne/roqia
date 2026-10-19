import React, {useContext} from 'react';
import {View} from 'react-native';
import {SvgXml} from 'react-native-svg';

import {themeContext} from '../store';
import {usePalette} from './ui';

// Eight-point interlocking stars, clipped by the screen edges as in 01-splash.
export const cornerPath = Array.from({length: 3}, (_, row) =>
  Array.from({length: 3 - row}, (_, col) => {
    const x = col * 62,
      y = row * 62;
    const points = [
      [0, -30],
      [9, -21],
      [21, -21],
      [21, -9],
      [30, 0],
      [21, 9],
      [21, 21],
      [9, 21],
      [0, 30],
      [-9, 21],
      [-21, 21],
      [-21, 9],
      [-30, 0],
      [-21, -9],
      [-21, -21],
      [-9, -21],
    ];
    return (
      points
        .map(([dx, dy], i) => `${i ? 'L' : 'M'}${x + dx},${y + dy}`)
        .join(' ') + 'Z'
    );
  }).join(' '),
).join(' ');

export function LaunchOrnaments() {
  const p = usePalette(),
    dark = useContext(themeContext).mode === 'dark';
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><path d="${cornerPath}" fill="none" stroke="${p.accent}" stroke-width="1"/></svg>`;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: dark ? 0 : undefined,
          right: dark ? undefined : 0,
          opacity: dark ? 0.22 : 0.25,
          transform: [{scaleX: dark ? 1 : -1}],
        }}>
        <SvgXml xml={xml} width={180} height={180} />
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: dark ? 0 : undefined,
          left: dark ? undefined : 0,
          opacity: dark ? 0.22 : 0.25,
          transform: [
            {rotate: dark ? '180deg' : '0deg'},
            {scaleY: dark ? 1 : -1},
          ],
        }}>
        <SvgXml xml={xml} width={180} height={180} />
      </View>
    </View>
  );
}
