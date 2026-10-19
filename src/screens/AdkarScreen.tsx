import React, {useContext} from 'react';
import {adkarData} from '../data';
import {adkarRepeatContext, themeContext} from '../store';
import {AppText, AppIcon, IconButton, usePalette} from '../design/ui';
import {rtlRow} from '../design/components';
import {View, Pressable, ScrollView, useWindowDimensions} from 'react-native';
import {number, ltr} from '../design/format';
import {DevotionalListScreen} from './DevotionalListScreen';
import {AdhkarArtwork, AdhkarOrnament} from './AdhkarArtwork';
const categories = [
  {id: 'Morning', title: 'أذكار الصباح', icon: 'sun', art: 'morning'},
  {id: 'Night', title: 'أذكار المساء', icon: 'moon', art: 'evening'},
  {id: 'BeforeSleep', title: 'أذكار قبل النوم', icon: 'bed', art: 'evening'},
] as const;
const groups = Object.fromEntries(
  categories.map(c => [c.id, adkarData.filter(i => i.category === c.id)]),
);
export function AdkarMenuScreen({navigation}: any) {
  const {repeatCounts} = useContext(adkarRepeatContext);
  const {mode, uiScale} = useContext(themeContext);
  const {width, fontScale} = useWindowDimensions();
  const p = usePalette();
  const dark = mode === 'dark';
  const compact = width < 360 || fontScale * uiScale > 1.2;
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: p.background}}
      contentContainerStyle={{
        padding: 16,
        paddingTop: 8,
        paddingBottom: 24,
        gap: 10,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}>
      <View style={{paddingVertical: 12, gap: 4, overflow: 'hidden'}}>
        {!dark && <AdhkarOrnament color={p.accent} left />}
        <View style={rtlRow}>
          <AppIcon name="sun" size={34} color={p.accent} strokeWidth={1.1} />
          <AppText
            role="screenTitle"
            accessibilityRole="header"
            style={{flex: 1, fontSize: 26 * uiScale, lineHeight: 42 * uiScale}}>
            أذكار اليوم
          </AppText>
          <IconButton
            name="search"
            label="البحث في المحتوى"
            onPress={() => navigation.navigate('Search')}
          />
        </View>
        <AppText role="body" style={{color: p.textSecondary}}>
          لحظات من الذكر خلال يومك
        </AppText>
      </View>
      {categories.map((c, index) => {
        const emphasized = !dark && c.id === 'BeforeSleep';
        const titleColor = emphasized ? '#FFFFFF' : p.textPrimary;
        const detailColor = emphasized ? '#E1EBDC' : p.textSecondary;
        const artColor = dark || emphasized ? '#DFC88D' : p.accent;
        const detail = ['بداية اليوم', 'ختام النهار', 'قبل النوم'][index];
        const progress = `${ltr(`${number(groups[c.id].filter(i => repeatCounts[i.id] === 0).length)} / ${number(groups[c.id].length)}`)} مكتمل`;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            accessibilityHint={`${detail} · ${progress}`}
            onPress={() => navigation.navigate(c.id)}
            style={({pressed}) => ({
              ...rtlRow,
              gap: 6,
              minHeight: dark ? 142 : 148,
              padding: 14,
              borderRadius: 16,
              borderWidth: dark ? 1 : 0,
              borderColor: p.borderSubtle,
              overflow: 'hidden',
              backgroundColor: dark
                ? '#173C30'
                : emphasized
                  ? '#164C3D'
                  : c.id === 'Morning'
                    ? '#E5EAD7'
                    : '#F0EBDB',
              opacity: pressed ? 0.8 : 1,
            })}>
            <AdhkarOrnament color={artColor} left={dark} />
            <View style={{flex: 1, gap: 4}}>
              <AppText
                role="sectionTitle"
                style={{
                  color: titleColor,
                  fontSize: 22 * uiScale,
                  lineHeight: 36 * uiScale,
                }}>
                {c.title}
              </AppText>
              <AppText role="body" style={{color: detailColor}}>
                {detail}
              </AppText>
            </View>
            <AdhkarArtwork
              kind={
                c.id === 'Morning'
                  ? 'morning'
                  : c.id === 'Night'
                    ? 'evening'
                    : 'sleep'
              }
              color={artColor}
              width={compact ? 88 : 136}
              height={118}
            />
            <AppIcon name="chevron-right" size={18} color={titleColor} />
          </Pressable>
        );
      })}
      <View
        style={{
          ...rtlRow,
          alignItems: 'stretch',
          flexDirection: compact ? 'column' : 'row-reverse',
        }}>
        {(
          [
            {
              title: 'الأدعية',
              detail: dark ? 'أدعية من القرآن والسنة' : 'من القرآن والسنة',
              route: 'Duaa',
            },
            {
              title: 'التسبيحات',
              detail: dark ? 'تسبيح وتهليل' : 'أذكار متنوعة',
              route: 'Tasbihat',
            },
          ] as const
        ).map(link => (
          <Pressable
            key={link.route}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            onPress={() => navigation.navigate(link.route)}
            style={({pressed}) => ({
              ...rtlRow,
              gap: 4,
              flex: compact ? undefined : 1,
              minHeight: 118,
              padding: 12,
              borderRadius: 14,
              backgroundColor: dark ? '#173C30' : p.surface,
              borderWidth: 1,
              borderColor: p.borderSubtle,
              overflow: 'hidden',
              opacity: pressed ? 0.8 : 1,
            })}>
            <AdhkarOrnament color={p.accent} left={dark} />
            <View style={{flex: 1, gap: 4}}>
              <AppText role="bodyStrong">{link.title}</AppText>
              <AppText role="caption" style={{color: p.textSecondary}}>
                {link.detail}
              </AppText>
            </View>
            {link.route === 'Duaa' ? (
              <AppIcon
                name="hands"
                size={44}
                color={p.accent}
                strokeWidth={0.85}
              />
            ) : (
              <AdhkarArtwork
                kind="tasbih"
                color={p.accent}
                width={44}
                height={72}
              />
            )}
            <AppIcon name="chevron-right" size={16} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
export function AdkarCategoryScreen({route}: any) {
  const category = categories.find(c => c.id === route.name)!;
  return (
    <DevotionalListScreen
      title={category.title}
      items={groups[category.id]}
      repeatCtx={adkarRepeatContext}
    />
  );
}
export const AdkarScreen = AdkarMenuScreen;
