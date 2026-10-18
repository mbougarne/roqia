import React, {useContext} from 'react';
import {adkarData} from '../data';
import {adkarRepeatContext, themeContext} from '../store';
import {AppText, Button, Page, Row} from '../design/ui';
import {Illustration} from '../design/Illustration';
import {FeatureCard, rtlRow} from '../design/components';
import {View} from 'react-native';
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
  return (
    <Page title="أذكار اليوم">
      <AppText>وردك اليومي، في وقتك المناسب</AppText>
      {categories.map(c => (
        <FeatureCard
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
        <View style={{flex: 1}}>
          <Button
            secondary
            label="الأدعية"
            icon="hands"
            onPress={() => navigation.navigate('Duaa')}
          />
        </View>
        <View style={{flex: 1}}>
          <Button
            secondary
            label="التسبيح"
            icon="tasbih"
            onPress={() => navigation.navigate('Tasbihat')}
          />
        </View>
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
