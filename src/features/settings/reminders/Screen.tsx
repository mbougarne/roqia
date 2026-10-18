import React, {useEffect, useState} from 'react';
import {Alert, AppState, I18nManager, Switch, View} from 'react-native';
import {
  AppText,
  Button,
  Card,
  Input,
  Page,
  usePalette,
} from '../../../design/ui';
import {type Reminder} from '../../../repositories/models';
import {reminderLabels, validateReminders} from './plan';
import {
  loadReminders,
  openReminderSettings,
  reconcileReminders,
  reminderPermission,
  requestReminderPermission,
  saveReminders,
  testReminder,
} from './service';
export function RemindersScreen({navigation}: any) {
  const [rows, setRows] = useState<Reminder[]>([]),
    [status, setStatus] = useState('جار التحقق من الإذن'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const p = usePalette();
  async function refresh() {
    try {
      const permission = await reminderPermission();
      setStatus(
        !permission.authorized
          ? 'إذن الإشعارات غير مفعل'
          : permission.channelBlocked
            ? 'قناة التذكيرات معطلة في الجهاز'
            : 'الإذن وقناة التذكيرات متاحان',
      );
    } catch {
      setError(true);
    }
  }
  async function load() {
    try {
      setRows(await loadReminders());
      await reconcileReminders();
      await refresh();
      setError(false);
    } catch {
      setError(true);
    }
  }
  useEffect(() => {
    void load();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') void refresh();
    });
    return () => sub.remove();
  }, []);
  const patch = (id: string, changes: Partial<Reminder>) =>
    setRows(prev =>
      prev.map(r => (r.reminderId === id ? {...r, ...changes} : r)),
    );
  async function save() {
    try {
      validateReminders(rows);
    } catch {
      Alert.alert(
        'راجع الوقت وأيام التذكير',
        'استخدم الوقت بصيغة 24 ساعة، مثلا 06:00، واختر يوما واحدا على الأقل.',
      );
      return;
    }
    setBusy(true);
    setError(false);
    try {
      if (rows.some(r => r.enabled)) await requestReminderPermission();
      const permission = await saveReminders(rows);
      await refresh();
      Alert.alert(
        'تم حفظ اختياراتك',
        !permission.authorized || permission.channelBlocked
          ? 'التذكيرات محفوظة لكنها لن تظهر حتى تفعّل الإذن والقناة من إعدادات الجهاز.'
          : 'ستعمل التذكيرات المختارة محليا. قد يؤخرها توفير الطاقة في الجهاز.',
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="التذكيرات اليومية" onBack={() => navigation.goBack()}>
      <AppText>
        تذكيرات اختيارية على جهازك. الأوقات حسب المنطقة الزمنية للجهاز. لا تطبق
        التغييرات إلا بعد الضغط على حفظ التذكيرات.
      </AppText>
      <AppText accessibilityLiveRegion="polite">{status}</AppText>
      <Button
        secondary
        label="إعدادات الإشعارات في الجهاز"
        onPress={() => {
          void openReminderSettings().catch(() => setError(true));
        }}
      />
      {error && (
        <Card>
          <AppText accessibilityRole="alert">
            تعذر تحميل أو جدولة التذكيرات. قد تكون اختياراتك محفوظة؛ أعد الحفظ
            لإصلاح الجدولة.
          </AppText>
          <Button
            label="إعادة التحميل"
            onPress={() => {
              void load();
            }}
          />
        </Card>
      )}
      {rows.map(r => (
        <Card key={r.reminderId} style={{gap: 12}}>
          <View
            style={{
              flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12,
            }}>
            <Switch
              disabled={busy}
              value={r.enabled}
              accessibilityLabel={`تفعيل ${reminderLabels[r.category]}`}
              onValueChange={enabled => patch(r.reminderId, {enabled})}
              thumbColor={r.enabled ? p.background : p.textSecondary}
              trackColor={{true: p.actionPrimary, false: p.borderControl}}
            />
            <AppText role="sectionTitle" style={{flex: 1}}>
              {reminderLabels[r.category]}
            </AppText>
          </View>
          <Input
            label={`وقت ${reminderLabels[r.category]} · HH:MM`}
            editable={!busy}
            value={r.localTimeHHmm}
            onChangeText={localTimeHHmm => patch(r.reminderId, {localTimeHHmm})}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            style={{writingDirection: 'ltr', textAlign: 'left'}}
          />
          <AppText role="caption">أيام التذكير</AppText>
          <View
            style={{
              flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
              flexWrap: 'wrap',
              gap: 8,
            }}>
            {[
              'الأحد',
              'الاثنين',
              'الثلاثاء',
              'الأربعاء',
              'الخميس',
              'الجمعة',
              'السبت',
            ].map((label, day) => (
              <Button
                key={day}
                compact
                label={label}
                disabled={busy}
                selected={r.weekdays.includes(day)}
                secondary={!r.weekdays.includes(day)}
                onPress={() =>
                  patch(r.reminderId, {
                    weekdays: r.weekdays.includes(day)
                      ? r.weekdays.filter(d => d !== day)
                      : [...r.weekdays, day],
                  })
                }
              />
            ))}
          </View>
        </Card>
      ))}
      <AppText role="caption">
        الصوت: صوت الإشعارات الافتراضي. يمكنك تغييره من إعدادات قناة التذكيرات.
        تذكير قراءة القرآن سيتاح مع مكتبة القرآن.
      </AppText>
      <Button
        label="حفظ التذكيرات"
        disabled={busy || !rows.length}
        onPress={() => {
          void save();
        }}
      />
      <Button
        secondary
        label="إرسال إشعار تجريبي"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void requestReminderPermission()
            .then(() => testReminder())
            .then(() =>
              Alert.alert(
                'تم إرسال الإشعار التجريبي',
                'اضغط الإشعار لفتح أذكار الصباح.',
              ),
            )
            .catch(() =>
              Alert.alert(
                'تعذر إرسال الإشعار',
                'راجع إذن الإشعارات والقناة في إعدادات الجهاز.',
              ),
            )
            .finally(() => {
              setBusy(false);
              void refresh();
            });
        }}
      />
    </Page>
  );
}
