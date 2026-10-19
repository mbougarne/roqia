import {useQuran} from '../features/quran/context';
import React, {useContext} from 'react';
import {Alert, View} from 'react-native';
import {
  Group,
  Ornament,
  Segments,
  Range,
  SettingRow,
  Toggle,
  Disclosure,
} from '../design/components';
import {
  AppIcon,
  AppText,
  Button,
  Card,
  Page,
  Row,
  StateView,
  usePalette,
} from '../design/ui';
import {themeContext, homeRepeatContext} from '../store';
import {useConfirmReset} from '../features/devotional/ResetConfirmation';
import {ltr} from '../design/format';
import {type ThemePreference} from '../repositories/models';
import {getSettings, updateSettings} from '../services/persistence';
export function MoreScreen({navigation}: any) {
  const p = usePalette();
  const rows = [
    ['Duaa', 'الأدعية', 'hands'],
    ['Tasbihat', 'التسبيح', 'tasbih'],
    ['Bookmarks', 'المحفوظات', 'bookmark'],
    ['Search', 'البحث في المحتوى', 'search'],
    ['Reminders', 'التذكيرات اليومية', 'bell'],
    ['Settings', 'الإعدادات', 'settings'],
    ['Downloads', 'التنزيلات', 'download'],
    ['Storage', 'إدارة التخزين', 'storage'],
    ['Sources', 'المصادر', 'book'],
    ['Guide', 'دليل الاستخدام', 'info'],
    ['Guidance', 'ضوابط الرقية الشرعية', 'shield'],
    ['About', 'حول التطبيق', 'info'],
    ['Privacy', 'سياسة الخصوصية', 'shield'],
    ['Terms', 'شروط الاستخدام', 'info'],
  ] as const;
  return (
    <Page title="المزيد">
      <Card
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingVertical: 14,
          gap: 16,
        }}>
        <AppIcon name="medallion" size={48} color={p.accent} />
        <View style={{flex: 1}}>
          <AppText role="sectionTitle">الرقية</AppText>
          <AppText role="caption" style={{color: p.textSecondary}}>
            مجاني · بلا إعلانات
          </AppText>
        </View>
      </Card>
      {[
        rows.slice(0, 3),
        [rows[6], rows[4], rows[5]],
        [rows[11], rows[8], rows[12], rows[13]],
      ].map((group, i) => (
        <Group key={i}>
          {group.map(([screen, title, icon]) => (
            <SettingRow
              key={screen}
              title={title}
              icon={icon}
              onPress={() => navigation.navigate(screen)}
            />
          ))}
        </Group>
      ))}
      <Disclosure title="الدليل والمزيد">
        <Row
          title="البحث في المحتوى"
          icon="search"
          onPress={() => navigation.navigate('Search')}
        />
        <Row
          title="إدارة التخزين"
          icon="storage"
          onPress={() => navigation.navigate('Storage')}
        />
        <Row
          title="دليل الاستخدام"
          icon="info"
          onPress={() => navigation.navigate('Guide')}
        />
        <Row
          title="ضوابط الرقية الشرعية"
          icon="shield"
          onPress={() => navigation.navigate('Guidance')}
        />
      </Disclosure>
    </Page>
  );
}

export function RecoveryScreen({route, navigation}: any) {
  return (
    <Page title="تعذر فتح الصفحة" onBack={() => navigation.goBack()}>
      <StateView
        title={
          route.params.reason === 'missing-pack'
            ? 'المصحف المطلوب غير مثبت'
            : 'الرابط غير صالح'
        }
        description="يمكنك متابعة استخدام المحتوى المتاح دون اتصال."
        action={{
          label: 'العودة إلى الرقية',
          onPress: () => navigation.navigate('MainTabs', {screen: 'Home'}),
        }}
      />
    </Page>
  );
}
export function SettingsScreen({navigation}: any) {
  const quran = useQuran();
  const confirmReset = useConfirmReset();
  const {
    preference,
    setPreference,
    uiScale,
    setUiScale,
    digitStyle,
    setDigitStyle,
  } = useContext(themeContext);
  const {resetAllRepeats} = useContext(homeRepeatContext);
  const [wifi, setWifi] = React.useState(true);
  React.useEffect(() => {
    void getSettings()
      .then(s => setWifi(s.wifiOnly))
      .catch(() => Alert.alert('تعذر استرجاع الإعدادات'));
  }, []);
  const toggleWifi = () => {
    const apply = () =>
      void updateSettings({wifiOnly: !wifi})
        .then(() => setWifi(!wifi))
        .catch(() => Alert.alert('تعذر حفظ الإعداد'));
    if (wifi)
      Alert.alert(
        'السماح ببيانات الهاتف؟',
        'قد تحتسب شركة الاتصال تكلفة البيانات للتنزيلات الجديدة.',
        [
          {text: 'إلغاء', style: 'cancel'},
          {text: 'السماح', onPress: apply},
        ],
      );
    else apply();
  };
  return (
    <Page title="الإعدادات" onBack={() => navigation.goBack()}>
      <Ornament title="المظهر والقراءة" />
      <Card>
        <AppText role="label">المظهر</AppText>
        <Segments
          value={preference}
          options={[
            {value: 'light', label: 'نهاري'},
            {value: 'dark', label: 'ليلي'},
            {value: 'system', label: 'حسب الجهاز'},
          ]}
          onChange={setPreference}
        />
        <Range
          label="حجم نص الواجهة"
          min={1}
          max={1.5}
          step={0.25}
          value={uiScale}
          onChange={v =>
            void setUiScale(v).catch(() => Alert.alert('تعذر حفظ حجم النص'))
          }
        />
        <AppText role="label">الأرقام</AppText>
        <Segments
          value={digitStyle}
          options={[
            {value: 'western', label: ltr('0123456789')},
            {value: 'eastern', label: ltr('٠١٢٣٤٥٦٧٨٩')},
          ]}
          onChange={value =>
            void setDigitStyle(value).catch(() =>
              Alert.alert('تعذر حفظ شكل الأرقام'),
            )
          }
        />
      </Card>
      <Ornament title="القرآن والتنزيلات" />
      <Group>
        <SettingRow
          title="المصحف المفضل"
          detail="اختيار الرواية وإعدادات القراءة"
          icon="book"
          onPress={() => navigation.navigate('QuranEditions')}
        />
        <SettingRow
          title="ترجمة المعاني"
          icon="translate"
          onPress={() => {
            void quran
              .preferred()
              .then(edition =>
                navigation.navigate('QuranTranslations', {
                  editionId: edition.id,
                }),
              )
              .catch(() => Alert.alert('تعذر استرجاع المصحف المفضل'));
          }}
        />
        <SettingRow title="التنزيل عبر Wi-Fi فقط" icon="wifi">
          <Toggle
            label="التنزيل عبر Wi-Fi فقط"
            value={wifi}
            onChange={toggleWifi}
          />
        </SettingRow>
        <SettingRow
          title="إدارة التخزين"
          icon="storage"
          onPress={() => navigation.navigate('Storage')}
        />
      </Group>
      <Group>
        <SettingRow
          title="التذكيرات اليومية"
          icon="bell"
          onPress={() => navigation.navigate('Reminders')}
        />
      </Group>
      <Button
        secondary
        icon="reset"
        label="إعادة جميع العدادات"
        onPress={() => confirmReset('إعادة جميع العدادات؟', resetAllRepeats)}
      />
      <AppText role="caption">
        حجم الواجهة مستقل عن القراءة. تطبق سياسة الشبكة على التنزيلات الجديدة.
      </AppText>
    </Page>
  );
}
