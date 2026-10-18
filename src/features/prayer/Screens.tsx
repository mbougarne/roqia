import React, {useCallback, useEffect, useState} from 'react';
import {Alert, AppState, Linking, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  AppText,
  Button,
  Card,
  Input,
  Page,
  Row,
  StateView,
  usePalette,
} from '../../design/ui';
import {ltr, number} from '../../design/format';
import {
  defaults,
  methods,
  labels,
  prayers,
  events,
  day,
  bearing,
  normalize,
  smoothHeading,
  validateLocation,
  type Preferences,
  type Location,
  type Timetable,
  type Day,
} from './domain';
import {
  civilDate as sourceDate,
  clock as sourceClock,
  nextDate,
  tzVersion,
} from './time';
import {
  loadPreferences,
  loadTables,
  savePreferences,
  reconcilePrayer,
  refreshTable,
  requestPrayerPermission,
  openPrayerSettings,
  testPrayerNotification,
  type Coverage,
} from './service';
import {adapter, locate, onHeading, onPrayerTimeChanged} from './native';
import cities from './cities.json';
const civilDate = (zone: string, at = Date.now()) => {
  try {
    return sourceDate(zone, at);
  } catch {
    return 'بيانات التوقيت غير متاحة لهذا التاريخ';
  }
};
const clock = (zone: string, at: number, format: '12' | '24' = '24') => {
  try {
    return sourceClock(zone, at, format);
  } catch {
    return '—';
  }
};
function usePrayer() {
  const [prefs, setPrefs] = useState<Preferences | null>(null),
    [tables, setTables] = useState<Timetable[]>([]),
    [coverage, setCoverage] = useState<Coverage | null>(null),
    [error, setError] = useState(false),
    [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    try {
      setPrefs(await loadPreferences());
      setTables(await loadTables());
      setCoverage(await reconcilePrayer());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      const removeTimeListener = onPrayerTimeChanged(() => {
        setNow(Date.now());
        void load();
      });
      const timer = setInterval(() => setNow(Date.now()), 1000);
      const sub = AppState.addEventListener('change', s => {
        if (s === 'active') {
          setNow(Date.now());
          void load();
        }
      });
      return () => {
        clearInterval(timer);
        removeTimeListener();
        sub.remove();
      };
    }, [load]),
  );
  const date = prefs?.location ? civilDate(prefs.location.zone, now) : '';
  useEffect(() => {
    if (date) void load();
  }, [date, load]);
  return {prefs, tables, coverage, error, now, load};
}
const fail = (error: unknown) => {
  if ((error as Error)?.message === 'location_cancelled') return;
  Alert.alert(
    'تعذر إكمال العملية',
    String((error as Error)?.message).includes('location_')
      ? 'تعذر الحصول على موقع حديث. تحقق من الإذن وخدمة الموقع، أو اختر المدينة يدويا.'
      : 'تحقق من القيم أو الاتصال وأعد المحاولة. تبقى البيانات المحفوظة متاحة.',
  );
};
function attempt(action: () => Promise<unknown>) {
  void action().catch(fail);
}
function Status({error, retry}: {error: boolean; retry: () => void}) {
  return error ? (
    <StateView
      title="تعذر تحديث البيانات أو جدولة التنبيهات"
      action={{label: 'إعادة المحاولة', onPress: retry}}
    />
  ) : null;
}
export function PrayerScreen({navigation}: any) {
  const {prefs, tables, coverage, error, now, load} = usePrayer();
  if (!prefs)
    return (
      <Page title="الصلاة">
        <StateView
          title={error ? 'تعذر فتح إعدادات الصلاة' : 'جار التحميل'}
          action={error ? {label: 'إعادة المحاولة', onPress: load} : undefined}
        />
      </Page>
    );
  const l = prefs.location,
    date = l ? civilDate(l.zone, now) : '',
    table = tables.find(t => t.cityId === l?.cityId);
  let today: Day | undefined, tomorrow: Day | undefined;
  try {
    today = day(prefs, date, table);
  } catch {}
  try {
    tomorrow = day(prefs, nextDate(date), table);
  } catch {}
  const next = [...(today?.rows ?? []), ...(tomorrow?.rows ?? [])].find(
      r => r.name !== 'sunrise' && r.at > now,
    ),
    remaining = next ? Math.max(0, Math.ceil((next.at - now) / 1000)) : 0;
  return (
    <Page title="الصلاة">
      <Status error={error} retry={load} />
      <Row
        title={l?.name ?? 'اختر مدينتك'}
        detail={
          l ? `${date} · ${l.zone}` : 'تعمل المدينة اليدوية دون إذن الموقع'
        }
        icon="location"
        onPress={() => navigation.navigate('PrayerLocation')}
      />
      {next && l && (
        <Card>
          <AppText role="caption">الصلاة القادمة</AppText>
          <AppText role="sectionTitle">
            {labels[next.name]} · {ltr(clock(l.zone, next.at, prefs.format))}
          </AppText>
          <AppText>
            المتبقي{' '}
            {ltr(
              `${Math.floor(remaining / 3600)}:${String(Math.floor(remaining / 60) % 60).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`,
            )}
          </AppText>
        </Card>
      )}
      {today && l ? (
        <>
          <AppText role="caption">
            {methods[prefs.method]}
            {prefs.method === 'habous'
              ? ' · حصة محفوظة'
              : ' · أوقات محسوبة وليست حصة الوزارة'}
          </AppText>
          {today.rows.map(r => (
            <Card key={r.name}>
              <View
                style={{
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                }}>
                <AppText role="bodyStrong">{labels[r.name]}</AppText>
                <AppText>{ltr(clock(l.zone, r.at, prefs.format))}</AppText>
              </View>
              <AppText role="caption">
                {r.name === 'sunrise'
                  ? 'وقت إرشادي بلا تنبيه'
                  : prefs.modes[r.name] === 'off'
                    ? 'التنبيه متوقف'
                    : !coverage?.authorized || coverage?.blocked
                      ? 'التنبيه محفوظ، الإذن أو القناة غير متاحين'
                      : 'تنبيه إشعار، قد يؤخره توفير الطاقة'}
              </AppText>
            </Card>
          ))}
          {!next && (
            <AppText>
              موعد الصلاة التالية خارج الحصة المحفوظة. حدّث الحصة أو اختر طريقة
              حساب.
            </AppText>
          )}
        </>
      ) : (
        <StateView
          title={
            l ? 'لا توجد مواقيت صالحة لهذا اليوم' : 'حدد المكان لعرض المواقيت'
          }
          description={
            l
              ? 'حدّث حصة المدينة، أو اختر طريقة حساب مناسبة. لا نستبدل الطريقة تلقائيا.'
              : 'لا يتم طلب إذن الموقع عند اختيار المدينة يدويا.'
          }
        />
      )}
      {l?.cityId && prefs.method === 'habous' && (
        <>
          <AppText role="caption">
            {table
              ? `الحصة محفوظة حتى ${Object.keys(table.dates).sort().at(-1)}`
              : 'الحصة غير محفوظة'}{' '}
            · وزارة الأوقاف والشؤون الإسلامية
          </AppText>
          <Button
            secondary
            label="تحديث حصة المدينة"
            onPress={() =>
              attempt(async () => {
                await refreshTable(l.cityId!);
                await load();
              })
            }
          />
        </>
      )}
      <Row
        title="اتجاه القبلة"
        icon="compass"
        onPress={() => navigation.navigate('Qibla')}
      />
      <Row
        title="تنبيهات الصلاة والأذان"
        icon="bell"
        onPress={() => navigation.navigate('PrayerAdhan')}
      />
      <Row
        title="طريقة الحساب والتوقيت"
        icon="settings"
        onPress={() => navigation.navigate('PrayerCalculation')}
      />
      <Row
        title="مصادر المواقيت والموقع"
        icon="info"
        onPress={() => navigation.navigate('PrayerSources')}
      />
    </Page>
  );
}
export function LocationScreen({navigation}: any) {
  const {prefs, error, load} = usePrayer(),
    [draft, setDraft] = useState({
      name: 'موقع يدوي',
      latitude: '',
      longitude: '',
      zone: 'Africa/Casablanca',
    }),
    [gps, setGps] = useState<Awaited<ReturnType<typeof locate>> | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (prefs?.location) {
      const l = prefs.location;
      setDraft({
        name: l.name,
        latitude: String(l.latitude),
        longitude: String(l.longitude),
        zone: l.zone,
      });
    }
  }, [prefs]);
  useFocusEffect(
    useCallback(
      () => () => {
        adapter?.cancelLocation();
      },
      [],
    ),
  );
  const save = async (l: Location) => {
    if (!prefs) return;
    await savePreferences({...prefs, location: validateLocation(l)});
    navigation.goBack();
  };
  return (
    <Page title="المدينة والموقع" onBack={() => navigation.goBack()}>
      <Status error={error} retry={load} />
      <AppText>
        اختر المدينة دون إذن الموقع. عند السفر غيّر المكان بنفسك؛ لا نتتبع موقعك
        ولا نغيّر مدينتك تلقائيا.
      </AppText>
      {cities.map(c => (
        <Button
          key={c.cityId}
          label={c.name}
          secondary
          disabled={!prefs || busy}
          onPress={() =>
            attempt(() => save({...c, source: 'city', acquiredAt: Date.now()}))
          }
        />
      ))}
      <Button
        label={busy ? 'جار تحديد الموقع' : 'استخدام موقعي مرة واحدة'}
        disabled={busy || !prefs}
        onPress={() =>
          attempt(async () => {
            setBusy(true);
            try {
              const result = await locate();
              setGps(result);
              setDraft(d => ({
                ...d,
                name: 'موقعي',
                latitude: String(result.latitude),
                longitude: String(result.longitude),
              }));
            } finally {
              setBusy(false);
            }
          })
        }
      />
      {gps && (
        <AppText>
          دقة الموقع {number(Math.round(gps.accuracy!))} متر. راجع المنطقة
          الزمنية ثم احفظ. إحداثيات GPS لا تختار مدينة تلقائيا.
        </AppText>
      )}
      <AppText role="sectionTitle">إحداثيات ومنطقة زمنية يدويا</AppText>
      {(['name', 'latitude', 'longitude', 'zone'] as const).map((k, i) => (
        <Input
          key={k}
          label={
            [
              'اسم المكان',
              'خط العرض (-90 إلى 90)',
              'خط الطول (-180 إلى 180)',
              'المنطقة الزمنية، مثل Europe/Paris',
            ][i]
          }
          value={draft[k]}
          autoCapitalize="none"
          onChangeText={v => {
            if (k === 'latitude' || k === 'longitude') setGps(null);
            setDraft(d => ({...d, [k]: v}));
          }}
        />
      ))}
      <AppText role="caption">
        المنطقة الزمنية تخص المكان المختار، وقد تختلف عن منطقة جهازك. مثال آخر:
        Asia/Riyadh.
      </AppText>
      <Button
        label="حفظ الموقع"
        disabled={!prefs || busy}
        onPress={() =>
          attempt(async () => {
            if (!draft.latitude.trim() || !draft.longitude.trim())
              throw Error('invalid_location');
            await save({
              cityId: null,
              name: draft.name.trim(),
              latitude: Number(draft.latitude),
              longitude: Number(draft.longitude),
              zone: draft.zone.trim(),
              source: gps ? 'gps' : 'manual',
              acquiredAt: gps?.acquiredAt ?? Date.now(),
              ...(gps ? {accuracy: gps.accuracy} : {}),
            });
          })
        }
      />
    </Page>
  );
}
export function QiblaScreen({navigation}: any) {
  const {prefs, error, load, now} = usePrayer(),
    p = usePalette(),
    [heading, setHeading] = useState<{
      heading: number;
      accuracy: number;
      at: number;
    } | null>(null),
    [state, setState] = useState('بدون قراءة حية');
  const l = prefs?.location;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const start = () => {
        setHeading(null);
        if (!adapter || !l) {
          setState('حساس الاتجاه غير متاح');
          return;
        }
        void adapter
          .startHeading(l.latitude, l.longitude)
          .then((ok: boolean) => {
            if (active)
              setState(ok ? 'في انتظار قراءة الحساس' : 'حساس الاتجاه غير متاح');
          })
          .catch(() => setState('حساس الاتجاه غير متاح'));
      };
      const remove = onHeading(e => {
        if (active)
          setHeading(prev => ({
            ...e,
            heading: prev ? smoothHeading(prev.heading, e.heading) : e.heading,
          }));
      });
      start();
      const sub = AppState.addEventListener('change', s => {
        if (s === 'active') start();
        else {
          adapter?.stopHeading();
          setHeading(null);
        }
      });
      return () => {
        active = false;
        remove();
        sub.remove();
        adapter?.stopHeading();
      };
    }, [l?.latitude, l?.longitude]),
  );
  let target: number | null = null;
  try {
    if (l) target = bearing(l);
  } catch {}
  const live = heading && now - heading.at < 2500 && heading.accuracy >= 2,
    angle =
      target === null ? 0 : normalize(target - (live ? heading!.heading : 0));
  return (
    <Page title="اتجاه القبلة" onBack={() => navigation.goBack()}>
      <Status error={error} retry={load} />
      {!l || target === null ? (
        <StateView
          title={l ? 'الاتجاه غير محدد قرب الكعبة' : 'اختر موقعك أولا'}
          action={{
            label: 'المدينة والموقع',
            onPress: () => navigation.navigate('PrayerLocation'),
          }}
        />
      ) : (
        <>
          <AppText role="sectionTitle">{l.name}</AppText>
          <AppText>{ltr(target.toFixed(1))}° من الشمال الحقيقي</AppText>
          <Card>
            <AppText style={{textAlign: 'center'}}>
              {live ? 'أعلى الجهاز ↑' : 'الشمال ↑'}
            </AppText>
            <View
              accessibilityLabel={
                live ? 'اتجاه نسبي للجهاز' : 'مخطط ثابت، الشمال إلى أعلى'
              }
              style={{
                alignSelf: 'center',
                width: 220,
                height: 220,
                borderRadius: 110,
                borderWidth: 2,
                borderColor: p.borderSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View style={{transform: [{rotate: `${angle}deg`}]}}>
                <AppText
                  style={{fontSize: 80, lineHeight: 100, textAlign: 'center'}}>
                  ↑
                </AppText>
              </View>
            </View>
            <AppText style={{textAlign: 'center'}}>
              {live
                ? 'اتجاه حي مصحح إلى الشمال الحقيقي'
                : 'مخطط ثابت: الشمال إلى أعلى'}
            </AppText>
          </Card>
          <AppText>
            {live
              ? 'ضع الجهاز بشكل مسطح بعيدا عن المعادن.'
              : heading
                ? 'دقة الاتجاه منخفضة أو القراءة قديمة. استخدم المخطط الثابت.'
                : state}
          </AppText>
          <Button
            secondary
            label="إرشادات معايرة البوصلة"
            onPress={() => navigation.navigate('QiblaCalibration')}
          />
          <Button
            secondary
            label="فتح الموقع في الخرائط الخارجية"
            onPress={() =>
              attempt(() =>
                Linking.openURL(
                  `geo:${l.latitude},${l.longitude}?q=21.4225241,39.8261818`,
                ),
              )
            }
          />
          <AppText role="caption">
            الخريطة تطبيق خارجي وقد تحتاج إلى اتصال. يبقى الاتجاه الرقمي متاحا
            دون اتصال.
          </AppText>
        </>
      )}
    </Page>
  );
}
export function CalibrationScreen({navigation}: any) {
  return (
    <Page title="معايرة البوصلة" onBack={() => navigation.goBack()}>
      <Card>
        <AppText>
          أبعد الجهاز عن المغناطيس والمعادن. ضع الهاتف بشكل مسطح، وحركه بلطف على
          شكل 8 إذا كانت الدقة منخفضة.
        </AppText>
        <AppText>
          قارن الاتجاه بمعلم معروف. هذه إرشادات فقط؛ لا تضمن المعايرة دقة
          الجهاز. عند غياب الحساس استخدم زاوية القبلة مع الشمال الحقيقي.
        </AppText>
      </Card>
      <Button label="العودة إلى القبلة" onPress={() => navigation.goBack()} />
    </Page>
  );
}
export function CalculationScreen({navigation}: any) {
  const {prefs, error, load} = usePrayer(),
    [draft, setDraft] = useState<Preferences | null>(null),
    [offsets, setOffsets] = useState<Record<string, string>>({});
  useEffect(() => {
    if (prefs) {
      setDraft(prefs);
      setOffsets(
        Object.fromEntries(events.map(n => [n, String(prefs.offsets[n])])),
      );
    }
  }, [prefs]);
  return (
    <Page title="طريقة الحساب والتوقيت" onBack={() => navigation.goBack()}>
      <Status error={error} retry={load} />
      {draft && (
        <>
          <AppText>
            الحصة المغربية تخص المدن والتواريخ المحفوظة فقط. الطرق الأخرى حسابات
            فلكية؛ اختر ما يناسب مكانك ولا تعتبرها حصة الوزارة.
          </AppText>
          {Object.entries(methods).map(([id, label]) => (
            <Button
              key={id}
              label={label}
              secondary={draft.method !== id}
              onPress={() =>
                setDraft({...draft, method: id as Preferences['method']})
              }
            />
          ))}
          {draft.method !== 'habous' && (
            <>
              <AppText role="sectionTitle">حساب العصر</AppText>
              {(['shafi', 'hanafi'] as const).map((v, i) => (
                <Button
                  key={v}
                  secondary={draft.asr !== v}
                  label={['المالكي والشافعي والحنبلي', 'الحنفي'][i]}
                  onPress={() => setDraft({...draft, asr: v})}
                />
              ))}
              <AppText role="sectionTitle">خطوط العرض العالية</AppText>
              {(['middle', 'seventh', 'angle'] as const).map((v, i) => (
                <Button
                  key={v}
                  label={['نصف الليل', 'سبع الليل', 'بحسب زاوية الشفق'][i]}
                  secondary={draft.highLatitude !== v}
                  onPress={() => setDraft({...draft, highLatitude: v})}
                />
              ))}
            </>
          )}
          <AppText role="sectionTitle">تعديل الدقائق (-30 إلى 30)</AppText>
          {events.map(n => (
            <Input
              key={n}
              label={labels[n]}
              value={offsets[n] ?? '0'}
              keyboardType="numbers-and-punctuation"
              onChangeText={v => setOffsets(o => ({...o, [n]: v}))}
            />
          ))}
          {(['24', '12'] as const).map(f => (
            <Button
              key={f}
              secondary={draft.format !== f}
              label={`${f} ساعة`}
              onPress={() => setDraft({...draft, format: f})}
            />
          ))}
          <Button
            secondary
            label="إعادة إعدادات الحساب الافتراضية"
            onPress={() =>
              Alert.alert(
                'إعادة إعدادات الحساب؟',
                'ستعود إلى حصة الوزارة مع تعديلات 0 دقيقة، دون تغيير موقعك أو التنبيهات.',
                [
                  {text: 'إلغاء'},
                  {
                    text: 'إعادة',
                    onPress: () => {
                      const d = defaults();
                      setDraft({
                        ...draft,
                        method: d.method,
                        asr: d.asr,
                        highLatitude: d.highLatitude,
                        format: d.format,
                      });
                      setOffsets(Object.fromEntries(events.map(n => [n, '0'])));
                    },
                  },
                ],
              )
            }
          />
          <Button
            label="حفظ إعدادات الحساب"
            onPress={() =>
              attempt(async () => {
                if (events.some(n => !/^[-+]?\d+$/.test(offsets[n]?.trim())))
                  throw Error('invalid_offset');
                await savePreferences({
                  ...draft,
                  offsets: Object.fromEntries(
                    events.map(n => [n, Number(offsets[n])]),
                  ) as Preferences['offsets'],
                });
                navigation.goBack();
              })
            }
          />
        </>
      )}
    </Page>
  );
}
export function AdhanScreen({navigation}: any) {
  const {prefs, coverage, error, load} = usePrayer(),
    [draft, setDraft] = useState<Preferences | null>(null),
    [pre, setPre] = useState('0'),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (prefs) {
      setDraft(prefs);
      setPre(String(prefs.preMinutes));
    }
  }, [prefs]);
  return (
    <Page title="تنبيهات الصلاة والأذان" onBack={() => navigation.goBack()}>
      <Status error={error} retry={load} />
      <Card>
        <AppText>
          الأذان الكامل غير متاح حاليا. اختيار الأذان الكامل يحفظ رغبتك ويستخدم
          تنبيه إشعار فقط في هذا الإصدار، دون تشغيل تسجيل.
        </AppText>
        <AppText>
          قد يؤخر توفير الطاقة الإشعار. افتح التطبيق لتجديد المواعيد؛ لا نضمن
          تجديدها أثناء إغلاقه طويلا.
        </AppText>
      </Card>
      <AppText>
        {coverage?.authorized && !coverage.blocked
          ? 'إذن الإشعارات متاح'
          : 'إذن الإشعارات أو القناة غير مفعل'}
      </AppText>
      <AppText role="caption">
        {coverage && prefs?.location
          ? `${number(coverage.scheduled)} إشعارات مجدولة · التغطية حتى ${civilDate(prefs.location.zone, coverage.coveredUntil)} ${clock(prefs.location.zone, coverage.coveredUntil)}`
          : 'لا توجد تغطية مجدولة'}
      </AppText>
      <Button
        secondary
        label="إعدادات الإشعارات في الجهاز"
        onPress={() => attempt(openPrayerSettings)}
      />
      {draft && (
        <>
          {prayers.map(n => (
            <Card key={n}>
              <AppText role="sectionTitle">{labels[n]}</AppText>
              {(['off', 'notification', 'full'] as const).map((m, i) => (
                <Button
                  key={m}
                  secondary={draft.modes[n] !== m}
                  label={`${labels[n]}: ${['متوقف', 'إشعار فقط', 'أذان كامل (إشعار حاليا)'][i]}`}
                  onPress={() =>
                    setDraft({...draft, modes: {...draft.modes, [n]: m}})
                  }
                />
              ))}
            </Card>
          ))}
          <Input
            label="تذكير قبل الصلاة بالدقائق (0 لإيقافه، حتى 30)"
            value={pre}
            keyboardType="number-pad"
            onChangeText={setPre}
          />
          <Button
            label="حفظ تنبيهات الصلاة"
            disabled={busy}
            onPress={() =>
              attempt(async () => {
                setBusy(true);
                try {
                  if (!/^\d+$/.test(pre)) throw Error('invalid_pre_reminder');
                  if (Object.values(draft.modes).some(m => m !== 'off'))
                    await requestPrayerPermission();
                  await savePreferences({...draft, preMinutes: Number(pre)});
                  await load();
                  Alert.alert(
                    'تم حفظ تنبيهات الصلاة',
                    'راجع حالة الإذن والتغطية المعروضة.',
                  );
                } finally {
                  setBusy(false);
                }
              })
            }
          />
        </>
      )}
      <Button
        secondary
        label="تجربة الإشعار"
        onPress={() =>
          attempt(async () => {
            await requestPrayerPermission();
            await testPrayerNotification();
            await load();
          })
        }
      />
      <Row
        title="أصوات الأذان"
        icon="volume"
        onPress={() => navigation.navigate('PrayerSounds')}
      />
      <Row
        title="التذكيرات اليومية"
        icon="bell"
        onPress={() => navigation.navigate('Reminders')}
      />
    </Page>
  );
}
export function SoundsScreen({navigation}: any) {
  return (
    <Page title="أصوات الأذان" onBack={() => navigation.goBack()}>
      <StateView
        title="لا توجد تسجيلات أذان متاحة للاختيار بعد"
        description="ستظهر التسجيلات مع اسم المؤذن والمصدر ونسخة الفجر عند توفرها. التنبيه الحالي يستخدم صوت إشعارات الجهاز؛ لا يشغّل أذانا كاملا."
      />
      <Button
        secondary
        label="إعداد صوت الإشعار في الجهاز"
        onPress={() => attempt(openPrayerSettings)}
      />
      <AppText>
        نتبع مستوى الصوت ووضع عدم الإزعاج في الجهاز. لا نرفع مستوى الصوت
        تلقائيا.
      </AppText>
    </Page>
  );
}
export function PrayerSourcesScreen({navigation}: any) {
  return (
    <Page title="مصادر الصلاة والقبلة" onBack={() => navigation.goBack()}>
      <Card>
        <AppText>
          الحصص المغربية: وزارة الأوقاف والشؤون الإسلامية. نحتفظ بأوقات الجدول
          المنشور للمدينة، مع تاريخ صلاحية. التحديث اتصال اختياري مباشر بالمصدر؛
          لا توجد خوادم خاصة بالتطبيق.
        </AppText>
        <Button
          secondary
          label="فتح موقع الوزارة"
          onPress={() =>
            attempt(() => Linking.openURL('https://www.habous.gov.ma/prieres/'))
          }
        />
      </Card>
      <Card>
        <AppText>
          إحداثيات المدن: GeoNames، ترخيص CC BY 4.0. المناطق الزمنية: IANA{' '}
          {tzVersion} محفوظة للاستخدام دون اتصال بين 2024 و2030.
        </AppText>
        <Button
          secondary
          label="مصدر إحداثيات المدن"
          onPress={() =>
            attempt(() =>
              Linking.openURL(
                'https://www.geonames.org/MA/largest-cities-in-morocco.html',
              ),
            )
          }
        />
      </Card>
      <Card>
        <AppText>
          طرق الحساب والقبلة: Adhan JS 4.4.6. إحداثيات الكعبة المستخدمة:
          21.4225241, 39.8261818. زاوية القبلة من الشمال الحقيقي؛ البوصلة تصحح
          الانحراف المغناطيسي مرة واحدة.
        </AppText>
        <AppText>
          اختيار طريقة حساب أخرى لا يجعلها حصة رسمية مغربية. الموقع اختياري
          ولمرة واحدة؛ المنطقة الزمنية اليدوية لا تتغير مع الجهاز.
        </AppText>
      </Card>
    </Page>
  );
}
