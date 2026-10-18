import React from 'react';
import {View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
// Decorative listening motif, not measured amplitude or a fake playback position.
export function Waveform({color}: {color: string}) {
  const heights = [
    5, 9, 16, 25, 36, 29, 18, 12, 22, 30, 17, 9, 15, 7, 13, 19, 11, 6, 10, 4, 8,
    5, 3, 2,
  ];
  return (
    <View accessible={false} style={{flex: 1, minWidth: 40, height: 40}}>
      <Svg
        width="100%"
        height="40"
        viewBox="0 0 144 40"
        preserveAspectRatio="none">
        {heights.map((h, i) => (
          <Path
            key={i}
            d={`M${i * 6 + 2} ${(40 - h) / 2}v${h}`}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={1 - i * 0.025}
          />
        ))}
      </Svg>
    </View>
  );
}
