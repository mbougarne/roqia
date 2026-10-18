import React, {useContext} from 'react';
import {adkarData} from '../data';
import {adkarRepeatContext, themeContext} from '../store';
import {AppText, Page, AppIcon, usePalette} from '../design/ui';
import {FeatureCard, rtlRow} from '../design/components';
import {View, Pressable} from 'react-native';
import {number, ltr} from '../design/format';
import {DevotionalListScreen} from './DevotionalListScreen';
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
  const {mode} = useContext(themeContext);
  const p = usePalette();
  return (
    <Page
      title="أذكار اليوم"
      subtitle="وردك اليومي، في وقتك المناسب"
      actions={<AppIcon name="sun" size={32} />}>
      {categories.map(c => (
        <FeatureCard
          tint={
            mode === 'light'
              ? c.id === 'Morning'
                ? '#E6EBD8'
                : '#F0EAD7'
              : undefined
          }
          roomy
          key={c.id}
          emphasized={c.id === 'BeforeSleep' && mode === 'light'}
          title={c.title}
          detail={`${ltr(`${number(groups[c.id].filter(i => repeatCounts[i.id] === 0).length)} / ${number(groups[c.id].length)}`)} مكتمل`}
          art={c.art}
          onPress={() => navigation.navigate(c.id)}
        />
      ))}
      <View style={{...rtlRow, alignItems: 'stretch'}}>
        {(
          [
            {title: 'الأدعية', icon: 'hands', route: 'Duaa'},
            {title: 'التسبيح', icon: 'tasbih', route: 'Tasbihat'},
          ] as const
        ).map(link => (
          <Pressable
            key={link.route}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            onPress={() => navigation.navigate(link.route)}
            style={{
              ...rtlRow,
              flex: 1,
              minHeight: 104,
              padding: 12,
              borderRadius: 12,
              backgroundColor: p.surface,
              borderWidth: 1,
              borderColor: p.borderSubtle,
            }}>
            <AppIcon
              name={link.icon}
              size={32}
              color={p.accent}
              strokeWidth={1.1}
            />
            <AppText role="bodyStrong" style={{flex: 1}}>
              {link.title}
            </AppText>
            <AppIcon name="chevron-left" size={14} />
          </Pressable>
        ))}
      </View>
    </Page>
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
