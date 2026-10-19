import React from 'react';
import {View} from 'react-native';
import {SvgXml} from 'react-native-svg';

// Decorative vectors scoped to the Adhkar landing screen.
const star = (x: number, y: number, size: number) =>
  `<path d="M${x} ${y - size}Q${x} ${y} ${x + size} ${y}Q${x} ${y} ${x} ${y + size}Q${x} ${y} ${x - size} ${y}Q${x} ${y} ${x} ${y - size}Z"/>`;

export function AdhkarArtwork({
  kind,
  color,
  width,
  height,
}: {
  kind: 'morning' | 'evening' | 'sleep' | 'tasbih';
  color: string;
  width: number;
  height: number;
}) {
  let drawing: string;
  if (kind === 'morning') {
    drawing = `<g fill="none" stroke="${color}" stroke-width="1.2">
      <path d="M14 116H186M27 121H173M60 116A40 40 0 0 1 140 116"/>
      ${Array.from({length: 13}, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 12;
        return `<path d="M${100 + 49 * Math.cos(a)} ${116 + 49 * Math.sin(a)}L${100 + 74 * Math.cos(a)} ${116 + 74 * Math.sin(a)}"/>`;
      }).join('')}
      </g>`;
  } else if (kind === 'tasbih') {
    drawing = `<g stroke="${color}" stroke-width="1.3" fill="none">
      <ellipse cx="103" cy="71" rx="39" ry="49"/>
      ${Array.from({length: 19}, (_, i) => {
        const a = (i * Math.PI * 2) / 19;
        return `<circle cx="${103 + 39 * Math.cos(a)}" cy="${71 + 49 * Math.sin(a)}" r="5" fill="${color}"/>`;
      }).join('')}
      <path d="M88 116L80 136L74 146M88 116L88 137L81 150M88 116L95 136L89 149M80 130L94 135M81 126L95 131"/>
      </g>`;
  } else {
    const moon = 'M105 18A57 57 0 1 1 58 121A62 62 0 0 0 105 18Z';
    drawing = `<defs><pattern id="weave" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 0L12 6L6 12L0 6ZM0 0L12 12M12 0L0 12" fill="none" stroke="${color}" stroke-width=".35" opacity=".45"/></pattern></defs>
      <path d="${moon}" fill="url(#weave)" stroke="${color}" stroke-width="1.2"/>
      <g fill="${color}">${star(58, 45, 7)}${star(44, 81, 6)}${star(70, 100, 4)}</g>
      ${
        kind === 'sleep'
          ? `<g fill="${color}">${star(97, 5, 4)}${star(153, 23, 4)}${star(166, 61, 3)}</g><path d="M8 144Q2 120 19 117Q32 114 37 135Q42 127 51 135M152 142Q151 113 164 115Q177 116 179 136Q195 126 199 146" fill="none" stroke="${color}" stroke-width=".7" opacity=".65"/>`
          : `<path d="M18 132H47M154 109H187M153 120H171" fill="none" stroke="${color}" stroke-width=".8" opacity=".7"/>`
      }`;
  }
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <SvgXml
        xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${kind === 'tasbih' ? '45 10 110 145' : '0 0 200 160'}">${drawing}</svg>`}
        width={width}
        height={height}
        accessible={false}
      />
    </View>
  );
}

export function AdhkarOrnament({
  color,
  left = false,
}: {
  color: string;
  left?: boolean;
}) {
  const petal = 'M60 7L72 26L69 45L60 53L51 45L48 26Z';
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: -52,
        left: left ? -58 : undefined,
        right: left ? undefined : -66,
        opacity: 0.16,
      }}>
      <SvgXml
        xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g fill="none" stroke="${color}" stroke-width=".7">${Array.from({length: 8}, (_, i) => `<path d="${petal}" transform="rotate(${i * 45} 60 60)"/>`).join('')}<path d="M60 40L80 60L60 80L40 60Z"/><circle cx="60" cy="60" r="48"/></g></svg>`}
        width={112}
        height={112}
        accessible={false}
      />
    </View>
  );
}
