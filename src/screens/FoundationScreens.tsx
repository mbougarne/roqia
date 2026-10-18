import React, {useContext} from 'react';
import {Alert} from 'react-native';
import {AppText, Button, Page, Row, StateView} from '../design/ui';
import {themeContext} from '../store';
import {type ThemePreference} from '../repositories/models';
import {getSettings, updateSettings} from '../services/persistence';
export function MoreScreen({navigation}: any) {
  return (
    <Page title="المزيد">
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
      <Row
        title="الإعدادات"
        icon="settings"
        onPress={() => navigation.navigate('Settings')}
      />
      <Row
        title="التنزيلات"
        icon="download"
        onPress={() => navigation.navigate('Downloads')}
      />
      <Row
        title="إدارة التخزين"
        icon="storage"
        onPress={() => navigation.navigate('Storage')}
      />
      <Row
        title="حول التطبيق"
        icon="info"
        onPress={() => navigation.navigate('About')}
      />
    </Page>
  );
}
export function QuranScreen() {
  return (
    <Page title="القرآن الكريم">
      <StateView
        title="المصاحف غير متاحة للتنزيل بعد"
        description="يجري التحقق من النص والخط وحقوق التوزيع لكل مصحف. ستتوفر روايتا ورش وحفص بعد إتمام المراجعة."
      />
    </Page>
  );
}
export function PrayerScreen() {
  return (
    <Page title="الصلاة">
      <StateView
        title="مواقيت الصلاة والقبلة"
        description="هذه الميزة قيد الإعداد. لن نعرض مواقيت قبل التحقق من طريقة الحساب والتوقيت المحلي."
      />
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
  const {preference, setPreference} = useContext(themeContext);
  const [wifi, setWifi] = React.useState(true);
  React.useEffect(() => {
    void getSettings().then(s => setWifi(s.wifiOnly));
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
          secondary={preference !== key}
          onPress={() => setPreference(key)}
        />
      ))}
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
    </Page>
  );
}
