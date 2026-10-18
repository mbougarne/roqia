import React from 'react';
import {View} from 'react-native';
import Svg, {Path, G} from 'react-native-svg';

// Decorative arabesque shared by the listen banner and compact player.
export function PanelArtwork({color}: {color: string}) {
  const star =
    Array.from({length: 32}, (_, i) => {
      const a = (i * Math.PI) / 16;
      const r = i % 2 ? 37 : 49;
      return `${i ? 'L' : 'M'}${60 + r * Math.cos(a)},${60 + r * Math.sin(a)}`;
    }).join(' ') + 'Z';
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        position: 'absolute',
        left: -18,
        top: -22,
        bottom: -22,
        width: 175,
        opacity: 0.18,
      }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 170 120"
        preserveAspectRatio="xMinYMid slice">
        <G fill="none" stroke={color} strokeWidth={0.65}>
          <Path d={star} />
          <Path d={star} transform="rotate(11.25 60 60)" />
          <Path d={star} transform="translate(17 17) scale(.72)" />
          <Path d="M2 118V44Q2 29 18 29V21Q42 19 60 2Q78 19 102 21V29Q118 29 118 44V118M127 0L154 27L127 54L154 81L127 108" />
        </G>
      </Svg>
    </View>
  );
}
