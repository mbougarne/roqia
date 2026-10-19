import React, {useEffect, useState} from 'react';
import {useFormat} from '../../../design/useFormat';
import {Alert, AppState, I18nManager, Switch, View} from 'react-native';
import {
  IconButton,
  Sheet,
  AppText,
  Button,
  Card,
  Input,
  Page,
  usePalette,
} from '../../../design/ui';
import {
  Banner,
  Disclosure,
  Group,
  Ornament,
  SettingRow,
  Toggle,
  rtlRow,
} from '../../../design/components';
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
  const {digits} = useFormat();
  const [rows, setRows] = useState<Reminder[]>([]),
    [status, setStatus] = useState('جار التحقق من الإذن'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [editing, setEditing] = useState<string | null>(null);
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
      <AppText role="caption" style={{textAlign: 'center'}}>
        تذكير لطيف في الوقت الذي تختاره
      </AppText>
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
      <Group>
        {rows.map(r => (
          <SettingRow
            key={r.reminderId}
            title={reminderLabels[r.category]}
            icon={
              r.category === 'Morning'
                ? 'sun'
                : r.category === 'Night'
                  ? 'moon'
                  : 'bed'
            }>
            <IconButton
              name="edit"
              label={'تعديل وقت ' + reminderLabels[r.category]}
              onPress={() => setEditing(r.reminderId)}
            />
            <AppText role="label" style={{writingDirection: 'ltr'}}>
              {digits(r.localTimeHHmm)}
            </AppText>
            <Toggle
              label={'تفعيل ' + reminderLabels[r.category]}
              value={r.enabled}
              disabled={busy}
              onChange={enabled => patch(r.reminderId, {enabled})}
            />
          </SettingRow>
        ))}
      </Group>
      <Ornament title="أيام التذكير" />
      {rows.map(r => (
        <SettingRow
          key={r.reminderId}
          title={reminderLabels[r.category]}
          detail={
            r.weekdays.length === 7
              ? 'كل يوم'
              : r.weekdays
                  .map(
                    d =>
                      [
                        'الأحد',
                        'الاثنين',
                        'الثلاثاء',
                        'الأربعاء',
                        'الخميس',
                        'الجمعة',
                        'السبت',
                      ][d],
                  )
                  .join(' · ')
          }
          icon="calendar"
          onPress={() => setEditing(r.reminderId)}
        />
      ))}
      <Group>
        <SettingRow
          title="صوت التذكير"
          detail="صوت الإشعارات الافتراضي"
          icon="bell"
          onPress={() =>
            void openReminderSettings().catch(() => setError(true))
          }
        />
      </Group>
      <Sheet
        title="وقت وأيام التذكير"
        visible={editing !== null}
        onClose={() => setEditing(null)}>
        {rows
          .filter(r => r.reminderId === editing)
          .map(r => (
            <View key={r.reminderId} style={{gap: 12}}>
              <Input
                label={'وقت ' + reminderLabels[r.category] + ' · HH:MM'}
                editable={!busy}
                value={r.localTimeHHmm}
                onChangeText={localTimeHHmm =>
                  patch(r.reminderId, {localTimeHHmm})
                }
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                style={{writingDirection: 'ltr'}}
              />
              <View style={{...rtlRow, flexWrap: 'wrap'}}>
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
                    compact
                    key={day}
                    label={label}
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
              <Button label="تم" onPress={() => setEditing(null)} />
            </View>
          ))}
      </Sheet>
      <Button
        label="حفظ التذكيرات"
        disabled={busy || !rows.length}
        onPress={() => {
          void save();
        }}
      />
      <Disclosure title="الإذن وتجربة التذكير">
        <AppText>
          تذكيرات اختيارية على جهازك. الأوقات حسب المنطقة الزمنية للجهاز. لا
          تطبق التغييرات إلا بعد الضغط على حفظ التذكيرات.
        </AppText>
        <AppText accessibilityLiveRegion="polite">{status}</AppText>
        <Button
          secondary
          label="إعدادات الإشعارات في الجهاز"
          onPress={() => {
            void openReminderSettings().catch(() => setError(true));
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
      </Disclosure>
    </Page>
  );
}
