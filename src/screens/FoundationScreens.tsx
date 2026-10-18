import React, {useContext} from 'react';
import {Alert} from 'react-native';
import {AppText, Button, Page, Row, StateView} from '../design/ui';
import {themeContext, homeRepeatContext} from '../store';
import {useConfirmReset} from '../features/devotional/ResetConfirmation';
import {number, ltr} from '../design/format';
import {type ThemePreference} from '../repositories/models';
import {getSettings, updateSettings} from '../services/persistence';
export function MoreScreen({navigation}: any) {
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
      {rows.map(([screen, title, icon]) => (
        <Row
          key={screen}
          title={title}
          icon={icon}
          onPress={() => navigation.navigate(screen)}
        />
      ))}
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
  const confirmReset = useConfirmReset();
  const {preference, setPreference, uiScale, setUiScale} =
    useContext(themeContext);
  const {resetAllRepeats} = useContext(homeRepeatContext);
  const [wifi, setWifi] = React.useState(true);
  React.useEffect(() => {
    void getSettings()
      .then(s => setWifi(s.wifiOnly))
      .catch(() => Alert.alert('تعذر استرجاع الإعدادات'));
  }, []);
  return (
    <Page title="الإعدادات" onBack={() => navigation.goBack()}>
      <AppText role="sectionTitle">المظهر</AppText>
      {(
        [
          ['system', 'حسب الجهاز'],
          ['light', 'نهاري'],
          ['dark', 'ليلي'],
        ] as [ThemePreference, string][]
      ).map(([key, label]) => (
        <Button
          key={key}
          label={`${preference === key ? '✓ ' : ''}${label}`}
          selected={preference === key}
          secondary={preference !== key}
          onPress={() => setPreference(key)}
        />
      ))}
      <AppText role="sectionTitle">حجم نص الواجهة</AppText>
      {[1, 1.25, 1.5].map(scale => (
        <Button
          key={scale}
          label={`${number(scale * 100)}%`}
          selected={uiScale === scale}
          secondary={uiScale !== scale}
          onPress={() => {
            void setUiScale(scale).catch(() =>
              Alert.alert('تعذر حفظ حجم النص'),
            );
          }}
        />
      ))}
      <AppText role="caption">
        حجم الواجهة مستقل عن نص القراءة. يحترم التطبيق أيضا حجم النص في جهازك.
      </AppText>
      <AppText>{`الأرقام المستخدمة دائما: ${ltr('0123456789')}`}</AppText>
      <Row
        title="المصحف المفضل والترجمة"
        detail="اختيار الرواية وإعدادات القراءة"
        icon="book"
        onPress={() => navigation.navigate('QuranEditions')}
      />
      <Row
        title="التنزيل عبر Wi-Fi فقط"
        detail={wifi ? 'مفعل' : 'غير مفعل'}
        icon="wifi"
        onPress={() => {
          const apply = () => {
            void updateSettings({wifiOnly: !wifi})
              .then(() => setWifi(!wifi))
              .catch(() => Alert.alert('تعذر حفظ الإعداد'));
          };
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
        }}
      />
      <AppText role="caption">
        تطبق سياسة الشبكة على التنزيلات الجديدة. التنزيلات الموجودة تحتفظ
        بالاختيار الذي بدأت به.
      </AppText>
      <Row
        title="التذكيرات اليومية"
        icon="bell"
        onPress={() => navigation.navigate('Reminders')}
      />
      <Button
        secondary
        icon="reset"
        label="إعادة جميع العدادات"
        onPress={() => confirmReset('إعادة جميع العدادات؟', resetAllRepeats)}
      />
      <Row
        title="إدارة التنزيلات والتخزين"
        icon="storage"
        onPress={() => navigation.navigate('Storage')}
      />
    </Page>
  );
}
