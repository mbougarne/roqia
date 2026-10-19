import React from 'react';
import {View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import {AppIcon, usePalette} from '../design/ui';

export function TasbihArch() {
  const p = usePalette();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{position: 'absolute', inset: 0}}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 460"
        preserveAspectRatio="none"
        accessible={false}>
        <Path
          d="M25 447V163Q25 137 47 137V119Q57 102 78 102Q80 60 120 51Q149 44 160 18Q171 44 200 51Q240 60 242 102Q263 102 273 119V137Q295 137 295 163V447"
          fill="none"
          stroke={p.accent}
          strokeWidth={0.8}
          opacity={0.25}
        />
      </Svg>
    </View>
  );
}

export function TasbihRing({
  size,
  progress,
  dark,
  children,
}: {
  size: number;
  progress: number;
  dark: boolean;
  children: React.ReactNode;
}) {
  const p = usePalette();
  const circumference = 2 * Math.PI * 118;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{position: 'absolute', inset: 0}}>
        <Svg
          width={size}
          height={size}
          viewBox="0 0 280 280"
          accessible={false}>
          <Circle
            cx={140}
            cy={140}
            r={118}
            stroke={dark ? '#254E3D' : p.surfaceMuted}
            strokeWidth={9}
            fill="none"
          />
          {progress > 0 && (
            <Circle
              cx={140}
              cy={140}
              r={118}
              stroke={p.actionPrimary}
              strokeWidth={9}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              rotation={-90}
              origin="140,140"
            />
          )}
        </Svg>
      </View>
      <View pointerEvents="none" style={{position: 'absolute', top: 4}}>
        <AppIcon name="medallion" size={24} color={p.accent} />
      </View>
      {dark && (
        <View pointerEvents="none" style={{position: 'absolute', bottom: 4}}>
          <AppIcon name="medallion" size={24} color={p.accent} />
        </View>
      )}
      {children}
    </View>
  );
}

export function TasbihTouch({color}: {color: string}) {
  return (
    <Svg width={44} height={48} viewBox="0 0 44 48" accessible={false}>
      <Path
        d="M18 26V12Q18 8 21 8Q24 8 24 12V24Q28 20 30 25Q34 22 36 27Q40 25 40 30V37Q40 44 32 45H25Q22 45 19 41L11 29Q9 25 12 24Q14 23 18 29ZM21 1V4M9 5L12 8M33 5L30 8"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TasbihVibration({color}: {color: string}) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M8 3H16Q17 3 17 4V20Q17 21 16 21H8Q7 21 7 20V4Q7 3 8 3ZM3 7L2 10L3 12L2 14L3 17M21 7L22 10L21 12L22 14L21 17"
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
