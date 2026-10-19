import React, {useState} from 'react';
import {Alert, FlatList, I18nManager, View} from 'react-native';

import {reloadBookmarks, removeBookmark, useBookmarks} from './bookmarks';
import {
  groupLabels,
  groupOf,
  itemTitle,
  matches,
  type DevotionalGroup,
} from './discovery';
import {rtlRow} from '../../design/components';
import {
  AppText,
  Button,
  Card,
  IconButton,
  Input,
  Page,
  Row,
  StateView,
  usePalette,
} from '../../design/ui';
import {contentById, contentItems} from '../../repositories/content';
import {DevotionalListScreen} from '../../screens/DevotionalListScreen';
import {
  homeRepeatContext,
  adkarRepeatContext,
  duaaRepeatContext,
  tasbihatRepeatContext,
} from '../../store';

const contexts = {
  ruqya: homeRepeatContext,
  adhkar: adkarRepeatContext,
  dua: duaaRepeatContext,
  tasbih: tasbihatRepeatContext,
};

export function ContentScreen({route, navigation}: any) {
  const item = contentById.get(route.params.contentId);
  if (!item)
    return (
      <Page title="المحتوى غير متاح" onBack={() => navigation.goBack()}>
        <StateView
          title="تعذر العثور على هذا الذكر"
          description="يمكنك البحث في المحتوى المتاح أو إزالة الإشارة القديمة من المحفوظات."
        />
      </Page>
    );
  return (
    <DevotionalListScreen
      title={groupLabels[groupOf(item.id)]}
      items={[item]}
      repeatCtx={contexts[groupOf(item.id)]}
    />
  );
}

export function DiscoveryScreen({navigation, route}: any) {
  const isSaved = route.name === 'Bookmarks',
    saved = useBookmarks(),
    p = usePalette();
  const [query, setQuery] = useState(''),
    [group, setGroup] = useState<DevotionalGroup | 'all'>('all');
  const rows = isSaved
    ? saved.items.map(b => ({
        key: b.bookmarkId,
        bookmarkId: b.bookmarkId,
        item:
          b.kind === 'devotional' ? contentById.get(b.contentId) : undefined,
      }))
    : contentItems.map(item => ({key: item.id, bookmarkId: undefined, item}));
  const filtered = rows.filter(r =>
    r.item ? matches(r.item, query, group) : group === 'all' && !query.trim(),
  );
  return (
    <View style={{flex: 1, backgroundColor: p.background}}>
      <View style={{...rtlRow, minHeight: 56, paddingHorizontal: 16}}>
        <IconButton
          name="chevron-right"
          label="رجوع"
          onPress={() => navigation.goBack()}
        />
        <AppText
          role="screenTitle"
          accessibilityRole="header"
          style={{flex: 1, textAlign: 'center'}}>
          {isSaved ? 'المحفوظات' : 'البحث في المحتوى'}
        </AppText>
        <View style={{width: 48}} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={r => r.key}
        initialNumToRender={8}
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{gap: 12}}>
            <Input
              label="البحث في الأذكار والأدعية والرقية والتسبيح"
              value={query}
              onChangeText={setQuery}
              placeholder="اكتب كلمة للبحث"
            />
            <View
              style={{
                flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
                flexWrap: 'wrap',
                gap: 8,
              }}>
              {(
                [['all', 'الكل'], ...Object.entries(groupLabels)] as [
                  DevotionalGroup | 'all',
                  string,
                ][]
              ).map(([key, label]) => (
                <Button
                  key={key}
                  compact
                  secondary={group !== key}
                  selected={group === key}
                  label={label}
                  onPress={() => setGroup(key)}
                />
              ))}
            </View>
            {saved.error && (
              <Button
                label="إعادة تحميل المحفوظات"
                onPress={() => {
                  void reloadBookmarks().catch(() => undefined);
                }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <StateView
            title={
              isSaved && saved.error
                ? 'تعذر تحميل المحفوظات'
                : isSaved && !saved.loaded
                  ? 'جار تحميل المحفوظات'
                  : 'لا توجد نتائج'
            }
            description={
              isSaved
                ? 'احفظ ذكرا من زر الإشارة في بطاقة القراءة، أو غيّر البحث والتصنيف.'
                : 'جرب كلمة أخرى أو تصنيفا مختلفا.'
            }
            action={
              isSaved
                ? {
                    label: 'تصفح الأذكار',
                    onPress: () =>
                      navigation.navigate('MainTabs', {screen: 'Adkar'}),
                  }
                : undefined
            }
          />
        }
        renderItem={({item: r}) => (
          <Card style={{gap: 8}}>
            {r.item ? (
              <Row
                title={itemTitle(r.item)}
                detail={groupLabels[groupOf(r.item.id)]}
                onPress={() =>
                  navigation.navigate('Content', {contentId: r.item!.id})
                }
              />
            ) : (
              <AppText>المحتوى المحفوظ غير متاح في هذه النسخة</AppText>
            )}
            {r.bookmarkId && (
              <Button
                secondary
                label="إزالة من المحفوظات"
                onPress={() => {
                  void removeBookmark(r.bookmarkId!).catch(() =>
                    Alert.alert('تعذر إزالة المحفوظ'),
                  );
                }}
              />
            )}
          </Card>
        )}
      />
    </View>
  );
}
