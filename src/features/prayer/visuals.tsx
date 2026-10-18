import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import {usePalette} from '../../design/ui';
import {normalize} from './domain';

// Original vector linework for the approved prayer/Qibla compositions. No
// scripture, publisher logo or screenshot pixels are used as runtime artwork.
export function PrayerLandmark({clock = false}: {clock?: boolean}) {
  const p = usePalette();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{width: '100%', aspectRatio: 1.2}}>
      <Svg width="100%" height="100%" viewBox="0 0 144 120" accessible={false}>
        <Path
          d="M24 105V54C24 34 57 26 65 10C73 26 106 34 106 54V105Z"
          fill={p.surfaceMuted}
        />
        <G
          fill="none"
          stroke={p.accent}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M8 108H136M24 108V70H92V108M34 70V55C34 42 58 37 58 24C58 37 82 42 82 55V70M58 24V17M54 14A5 5 0 0 0 62 14M18 108V87H24M92 91H101V108" />
          <Path d="M108 108V40H121V108M106 40H123L120 32H109ZM112 32V21Q115 14 118 21V32M115 15V10M110 52H119M110 59H119" />
          {clock ? (
            <>
              <Circle cx="58" cy="87" r="13" />
              <Path d="M58 78V87L65 91" />
            </>
          ) : (
            <Path d="M46 108V91A12 12 0 0 1 70 91V108" />
          )}
        </G>
      </Svg>
    </View>
  );
}

// Screen-relative geometry: north and the rose rotate by -heading; the
// Qibla pointer rotates by bearing-heading. A null heading is north-up.
export function QiblaCompass({
  bearing,
  heading,
}: {
  bearing: number;
  heading: number | null;
}) {
  const p = usePalette(),
    angle = normalize(bearing - (heading ?? 0));
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.compass}>
      <Svg width="100%" height="100%" viewBox="0 0 320 320" accessible={false}>
        <Circle
          cx="160"
          cy="160"
          r="154"
          fill={p.background}
          stroke={p.accent}
          strokeWidth="1.5"
        />
        <Circle
          cx="160"
          cy="160"
          r="149"
          fill="none"
          stroke={p.surfaceMuted}
          strokeWidth="5"
        />
        <G stroke={p.accent} opacity={0.13} fill="none" strokeWidth="1.5">
          <Path d="M160 77L180 112L215 105L208 140L243 160L208 180L215 215L180 208L160 243L140 208L105 215L112 180L77 160L112 140L105 105L140 112Z" />
          <Path d="M160 100L202 118L220 160L202 202L160 220L118 202L100 160L118 118ZM160 100V220M100 160H220M118 118L202 202M202 118L118 202" />
        </G>
        <G rotation={-(heading ?? 0)} origin="160,160">
          {Array.from({length: 60}, (_, i) => (
            <Line
              key={i}
              x1="160"
              y1="12"
              x2="160"
              y2={i % 5 === 0 ? 26 : 20}
              stroke={i % 5 === 0 ? p.accent : p.borderControl}
              strokeWidth={i % 5 === 0 ? 1.6 : 1}
              rotation={i * 6}
              origin="160,160"
            />
          ))}
          {[
            ['N', 160, 45],
            ['E', 278, 166],
            ['S', 160, 286],
            ['W', 42, 166],
          ].map(([label, x, y]) => (
            <SvgText
              key={label}
              x={x}
              y={y}
              fill={p.textPrimary}
              fontSize="17"
              fontWeight="600"
              textAnchor="middle">
              {label}
            </SvgText>
          ))}
        </G>
        <G rotation={angle} origin="160,160">
          <Path d="M154 160L160 83L166 160Z" fill={p.accent} />
          <Path d="M160 83L160 160L166 160Z" fill={p.accent} opacity={0.5} />
          <Circle
            cx="160"
            cy="70"
            r="15"
            fill={p.background}
            stroke={p.accent}
            strokeWidth="1.6"
          />
          <G
            rotation={-angle}
            origin="160,70"
            fill="none"
            stroke={p.accent}
            strokeWidth="1.3"
            strokeLinejoin="round">
            <Polygon
              points="151,65 160,61 169,65 169,76 160,80 151,76"
              fill={p.actionPrimary}
            />
            <Path d="M151 65L160 69L169 65M160 69V80M151 69L160 73L169 69" />
          </G>
        </G>
        <Circle cx="160" cy="160" r="11" fill={p.accent} />
        <Circle cx="160" cy="160" r="8" fill={p.actionPrimary} />
      </Svg>
    </View>
  );
}
export function OrnamentDivider() {
  const p = usePalette();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.divider}>
      <View style={{flex: 1, height: 1, backgroundColor: p.accent}} />
      <Svg width={20} height={20} viewBox="0 0 20 20" accessible={false}>
        <Path
          d="M10 1L19 10L10 19L1 10ZM4 4H16V16H4Z"
          fill="none"
          stroke={p.accent}
        />
      </Svg>
      <View style={{flex: 1, height: 1, backgroundColor: p.accent}} />
    </View>
  );
}
const styles = StyleSheet.create({
  compass: {width: '100%', maxWidth: 360, aspectRatio: 1, alignSelf: 'center'},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
});
