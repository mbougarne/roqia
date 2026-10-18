// Native vector artwork for the reference compositions. No source text or
// publisher marks are drawn into decorative illustrations.
export function artwork(
  name: string,
  p: {
    background: string;
    surfaceMuted: string;
    accent: string;
    actionPrimary: string;
    textPrimary: string;
  },
  dark: boolean,
): string | undefined {
  const gold = p.accent,
    green = dark ? '#B7D9A5' : '#164C3D';
  const start =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><g stroke-linecap="round" stroke-linejoin="round">';
  const end = '</g></svg>';
  if (name === 'quran-book')
    return (
      start +
      '<circle cx="120" cy="88" r="72" fill="' +
      p.surfaceMuted +
      '" stroke="' +
      gold +
      '" stroke-width=".7"/>' +
      '<g fill="none" stroke="' +
      gold +
      '" stroke-width="1"><path d="M120 4V6M120 10V12M120 158V160M120 164V166"/><path d="M120 17l3 5 6-1-1 6 5 3-5 3 1 6-6-1-3 5-3-5-6 1 1-6-5-3 5-3-1-6 6 1z"/></g>' +
      '<path d="M65 130L171 151L173 144L81 116Z" fill="#8B641F" stroke="' +
      '#164C3D' +
      '" stroke-width="2"/><path d="M175 130L69 151L67 144L159 116Z" fill="#BFA16A" stroke="' +
      '#164C3D' +
      '" stroke-width="2"/>' +
      '<path d="M120 125L48 106L59 53Q89 48 120 69Q151 48 181 53L192 106Z" fill="' +
      '#164C3D' +
      '" stroke="' +
      gold +
      '" stroke-width="2"/>' +
      '<path d="M120 119L55 103L65 49Q94 52 120 69Q146 52 175 49L185 103Z" fill="#F8F1DB" stroke="' +
      gold +
      '" stroke-width="1.3"/>' +
      '<path d="M120 116V69M63 100Q91 103 116 115M177 100Q149 103 124 115" fill="none" stroke="#9E8759" stroke-width="1"/>' +
      Array.from(
        {length: 7},
        (_, i) =>
          '<path d="M' +
          (69 - i * 0.8) +
          ' ' +
          (60 + i * 5.5) +
          'Q91 ' +
          (62 + i * 5.7) +
          ' 115 ' +
          (78 + i * 4.5) +
          'M' +
          (171 + i * 0.8) +
          ' ' +
          (60 + i * 5.5) +
          'Q149 ' +
          (62 + i * 5.7) +
          ' 125 ' +
          (78 + i * 4.5) +
          '" fill="none" stroke="#B9AB88" stroke-width=".7"/>',
      ).join('') +
      end
    );
  if (name === 'listening') {
    const ink = dark ? gold : green;
    return (
      start +
      (dark
        ? `<path d="M27 172V83Q27 61 51 61V51Q51 29 87 22Q111 16 120 5Q129 16 153 22Q189 29 189 51V61Q213 61 213 83V172" fill="none" stroke="${gold}" opacity=".25"/>`
        : `<circle cx="120" cy="87" r="65" fill="${p.surfaceMuted}" opacity=".5"/><path d="M64 111A66 66 0 1 1 181 104M23 151Q47 140 76 157T145 163T218 156" fill="none" stroke="${gold}" stroke-width=".8"/>`) +
      `<g fill="none" stroke="${ink}" stroke-width="1.5"><path d="M78 112V88a42 42 0 0 1 84 0v24M82 109V88a38 38 0 0 1 76 0v21"/>
      <rect x="75" y="99" width="22" height="44" rx="9" transform="rotate(-12 86 121)" fill="${p.background}"/><path d="M84 101v40" transform="rotate(-12 86 121)"/>
      <rect x="143" y="99" width="22" height="44" rx="9" transform="rotate(12 154 121)" fill="${p.background}"/><path d="M156 101v40" transform="rotate(12 154 121)"/></g>` +
      (dark
        ? `<path d="M43 111v8m7-15v22m7-28v34M183 98v34m7-28v22m7-15v8M120 31l3 3-3 3-3-3z" fill="none" stroke="${gold}" stroke-width="1"/>`
        : '') +
      end
    );
  }
  if (name === 'morning')
    return (
      start +
      '<g fill="none" stroke="' +
      gold +
      '" stroke-width="1.3"><path d="M28 130H212M39 137H201M67 128A53 53 0 0 1 173 128"/>' +
      Array.from({length: 13}, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 12;
        return (
          '<path d="M' +
          (120 + 63 * Math.cos(a)) +
          ' ' +
          (128 + 63 * Math.sin(a)) +
          'L' +
          (120 + 83 * Math.cos(a)) +
          ' ' +
          (128 + 83 * Math.sin(a)) +
          '"/>'
        );
      }).join('') +
      '</g>' +
      end
    );
  if (name === 'evening')
    return (
      start +
      '<g stroke="' +
      gold +
      '" stroke-width="1.3" fill="none"><path d="M124 30A59 59 0 1 0 171 119A65 65 0 0 1 124 30Z"/><path d="M48 51v12m-6-6h12M182 58v14m-7-7h14M186 131v10m-5-5h10M93 120v8m-4-4h8"/><circle cx="165" cy="36" r="2"/><circle cx="49" cy="109" r="2"/><path d="M49 154h146" opacity=".4"/></g>' +
      end
    );
  if (name === 'qibla')
    return (
      start +
      '<circle cx="120" cy="88" r="60" fill="' +
      p.surfaceMuted +
      '"/><g fill="none" stroke="' +
      gold +
      '" stroke-width="1.5"><path d="M122 93C69 26 16 40 21 91C27 146 79 149 122 93C167 35 219 33 219 89C219 145 165 143 122 93Z" stroke-dasharray="4 4"/><path d="M24 84l-4 9 9-3M216 95l4-9-9 3"/></g><g transform="rotate(12 120 88)" fill="' +
      p.background +
      '" stroke="' +
      green +
      '" stroke-width="1.5"><rect x="93" y="31" width="54" height="114" rx="8"/><rect x="98" y="37" width="44" height="100" rx="4"/><path d="M113 42h13"/><circle cx="120" cy="87" r="16"/><path d="M111 95l7-16 11-5-7 16z" fill="' +
      gold +
      '"/></g>' +
      end
    );
  return undefined;
}
