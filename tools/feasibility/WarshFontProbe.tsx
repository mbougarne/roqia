/* Debug-only rendering of exact source strings. Never substitute canonical text. */
import React, {useEffect, useState} from 'react';
import {NativeModules, ScrollView, Text, View} from 'react-native';

type Sample = {ref: string; text: string};

export default function WarshFontProbe({scenario}: {scenario: string}) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [error, setError] = useState('Loading and checking fonts…');
  const dark = scenario.includes('dark');
  const large = scenario.includes('large');
  const marks = scenario.includes('marks');
  const color = dark ? '#f4f0e6' : '#163d33';
  const surface = dark ? '#182b25' : '#ffffff';
  useEffect(() => {
    let active = true;
    NativeModules.RoqiaProbe.prepareWarshFonts()
      .then((raw: string) => {
        if (!active) return;
        const data = JSON.parse(raw);
        setSamples(data.samples);
        setError('');
        NativeModules.RoqiaProbe.record(
          'scenario-finished',
          JSON.stringify({
            scenario,
            sampleReferences: data.samples.map((s: Sample) => s.ref),
          }),
        );
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
        NativeModules.RoqiaProbe.record(
          'scenario-failed',
          JSON.stringify({scenario, error: e.message}),
        );
      });
    return () => {
      active = false;
    };
  }, [scenario]);
  const chosen = marks
    ? samples.filter(
        s => !['1:1', '1:3', '2:253', '2:254', '112:1'].includes(s.ref),
      )
    : samples;
  return (
    <ScrollView
      style={{backgroundColor: dark ? '#0f1c18' : '#f5f1e8'}}
      contentContainerStyle={{padding: 20, paddingTop: 48, paddingBottom: 60}}>
      <Text style={{color, fontSize: 16}}>
        Warsh font comparison · {dark ? 'dark' : 'light'}
      </Text>
      <Text style={{color, fontSize: 12, marginVertical: 12}}>
        KFGQPC v2.1 · exact source strings · UI 0123456789
        {large ? ' · enlarged' : ''}
      </Text>
      {!!error && <Text style={{color}}>{error}</Text>}
      {chosen.map(sample => (
        <View key={sample.ref} style={{marginBottom: 18}}>
          <Text style={{color, fontSize: 12, marginBottom: 6}}>
            Warsh reference {sample.ref}
          </Text>
          {['WarshKfgqpc', 'WarshMaghribi'].map(family => (
            <View
              key={family}
              style={{
                backgroundColor: surface,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
              }}>
              <Text style={{color, fontSize: 12}}>
                {family === 'WarshKfgqpc'
                  ? 'King Fahd · source font'
                  : 'AL Maghribi · comparison only'}
              </Text>
              <Text
                selectable
                style={{
                  color,
                  fontFamily: family,
                  fontSize: large ? 36 : 26,
                  lineHeight: large ? 76 : 56,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  includeFontPadding: true,
                }}>
                {sample.text}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
