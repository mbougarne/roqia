import React, {useContext} from 'react';
import {adkarData} from '../data';
import {adkarRepeatContext} from '../store';
import {AppText, Card, Page, Row} from '../design/ui';
import {Illustration} from '../design/Illustration';
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
  return (
    <Page title="أذكار اليوم">
      <AppText>وردك اليومي، في وقتك المناسب</AppText>
      {categories.map(c => (
        <Card key={c.id}>
          <Illustration name={c.art} height={90} />
          <Row
            title={c.title}
            icon={c.icon}
            detail={`${ltr(`${number(groups[c.id].filter(i => repeatCounts[i.id] === 0).length)} / ${number(groups[c.id].length)}`)} مكتمل`}
            onPress={() => navigation.navigate(c.id)}
          />
        </Card>
      ))}
      <Row
        title="الأدعية"
        icon="hands"
        onPress={() => navigation.navigate('Duaa')}
      />
      <Row
        title="التسبيح"
        icon="tasbih"
        onPress={() => navigation.navigate('Tasbihat')}
      />
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
