import React from 'react';
import {View} from 'react-native';
import Svg, {Circle, G, Path} from 'react-native-svg';

import {usePalette} from './ui';

export function ListeningArtwork({size = 180}: {size?: number}) {
  const p = usePalette();
  const frame =
    Array.from({length: 24}, (_, i) => {
      const a = (i * Math.PI) / 12,
        r = i % 2 ? 69 : 84;
      return `${i ? 'L' : 'M'}${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
    }).join(' ') + 'Z';
  return (
    <View
      accessible={false}
      style={{alignItems: 'center', paddingVertical: 12}}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle
          cx={100}
          cy={100}
          r={91}
          fill={p.surface}
          stroke={p.accent}
          strokeWidth={0.35}
        />
        <G fill="none" stroke={p.accent} strokeWidth={0.8}>
          <Path d={frame} />
          <Path d={frame} transform="rotate(15 100 100)" />
          <Circle cx={100} cy={100} r={62} strokeWidth={0.35} />
        </G>
        <G
          stroke={p.textPrimary}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill={p.background}>
          <Path d="M100 121L57 104L62 70Q82 64 100 82Q118 64 138 70L143 104Z" />
          <Path d="M100 116L64 101L68 73Q85 72 100 85Q115 72 132 73L136 101ZM100 85V116" />
          <Path
            d="M66 124L132 143M134 124L68 143"
            stroke={p.accent}
            strokeWidth={3}
          />
        </G>
        <Path
          d="M71 82Q84 82 96 92M70 88Q84 88 96 98M129 82Q116 82 104 92M130 88Q116 88 104 98"
          fill="none"
          stroke={p.accent}
          strokeWidth={0.7}
        />
      </Svg>
    </View>
  );
}
