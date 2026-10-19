import React, {useContext, useRef, useState} from 'react';
import {AccessibilityInfo, ScrollView, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {Ornament, rtlRow} from '../../design/components';
import {AppIcon, AppText, Card, Page, usePalette} from '../../design/ui';
import {useFormat} from '../../design/useFormat';
import {themeContext} from '../../store';
import {names} from './content';

export function AsmaScreen({navigation}: any) {
  const p = usePalette();
  const {number} = useFormat();
  const {uiScale} = useContext(themeContext);
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const item = names[index];
  const nameSize = item.name.includes(' ') ? 34 : 56;
  function move(offset: number) {
    const next = Math.max(0, Math.min(names.length - 1, index + offset));
    if (next === index) return;
    setIndex(next);
    scroll.current?.scrollTo({y: 0, animated: false});
    AccessibilityInfo.announceForAccessibility(names[next].name);
  }
  const swipe = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onEnd((event, success) => {
      const {translationX: x, translationY: y} = event;
      if (success && Math.abs(x) >= 56 && Math.abs(x) > Math.abs(y) * 1.5)
        move(x > 0 ? 1 : -1);
    });
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <GestureDetector gesture={swipe}>
        <View style={{flex: 1}} collapsable={false}>
          <Page
            title="أسماء الله الحسنى"
            onBack={() => navigation.goBack()}
            scrollRef={scroll}
            contentStyle={{flexGrow: 1, paddingTop: 12, paddingBottom: 20}}
            headerContent={
              <View
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="التنقل بين أسماء الله الحسنى"
                accessibilityValue={{
                  min: 1,
                  max: names.length,
                  now: index + 1,
                  text: `الاسم ${number(index + 1)} من ${number(names.length)}`,
                }}
                accessibilityHint="اسحب لليمين للاسم التالي أو لليسار للاسم السابق"
                accessibilityActions={[
                  ...(index < names.length - 1
                    ? [{name: 'increment' as const, label: 'الاسم التالي'}]
                    : []),
                  ...(index > 0
                    ? [{name: 'decrement' as const, label: 'الاسم السابق'}]
                    : []),
                ]}
                onAccessibilityAction={event => {
                  if (event.nativeEvent.actionName === 'increment') move(1);
                  if (event.nativeEvent.actionName === 'decrement') move(-1);
                }}
                style={{
                  gap: 8,
                  maxWidth: 560,
                  width: '100%',
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  paddingBottom: 4,
                  alignSelf: 'center',
                }}>
                <View
                  style={{
                    height: 3,
                    backgroundColor: p.borderSubtle,
                    borderRadius: 2,
                  }}>
                  <View
                    style={{
                      height: 3,
                      width: `${((index + 1) / names.length) * 100}%`,
                      alignSelf: 'flex-end',
                      backgroundColor: p.accent,
                      borderRadius: 2,
                    }}
                  />
                </View>
                <View style={{...rtlRow, justifyContent: 'space-between'}}>
                  <AppIcon
                    name="chevron-right"
                    size={18}
                    color={
                      index === names.length - 1
                        ? p.borderSubtle
                        : p.textSecondary
                    }
                  />
                  <AppText
                    role="caption"
                    style={{textAlign: 'center', color: p.textSecondary}}>
                    الاسم {number(index + 1)} من {number(names.length)}
                  </AppText>
                  <AppIcon
                    name="chevron-left"
                    size={18}
                    color={index === 0 ? p.borderSubtle : p.textSecondary}
                  />
                </View>
              </View>
            }>
            <Card
              key={item.name}
              style={{
                flexGrow: 1,
                padding: 0,
                gap: 0,
                borderRadius: 24,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 240,
                  paddingHorizontal: 24,
                  paddingVertical: 40,
                  gap: 20,
                  backgroundColor: p.surfaceMuted,
                }}>
                <View
                  pointerEvents="none"
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    bottom: 12,
                    left: 12,
                  }}>
                  <Svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 300 220"
                    preserveAspectRatio="none">
                    <Path
                      d="M22 1H1V22M278 1H299V22M1 198V219H22M278 219H299V198"
                      fill="none"
                      stroke={p.accent}
                      strokeWidth={1}
                      opacity={0.55}
                    />
                    <Path
                      d="M28 8H8V28M272 8H292V28M8 192V212H28M272 212H292V192"
                      fill="none"
                      stroke={p.accent}
                      strokeWidth={0.5}
                      opacity={0.3}
                    />
                  </Svg>
                </View>
                <AppIcon name="medallion" size={28} color={p.accent} />
                <AppText
                  selectable
                  accessibilityRole="header"
                  role="screenTitle"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontFamily: 'RoqiaArabic700',
                    fontSize: nameSize * uiScale,
                    lineHeight: (nameSize + 24) * uiScale,
                  }}>
                  {item.name}
                </AppText>
              </View>
              <View style={{padding: 24, gap: 16, flexGrow: 1}}>
                <Ornament title="المعنى" />
                <AppText
                  selectable
                  style={{fontSize: 17 * uiScale, lineHeight: 32 * uiScale}}>
                  {item.meaning}
                </AppText>
              </View>
            </Card>
          </Page>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
