import {useFocusEffect} from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Vibration,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import cities from './cities.json';
import {
  defaults,
  methods,
  labels,
  prayers,
  events,
  day,
  bearing,
  smoothHeading,
  type Preferences,
  type Location,
  type Timetable,
  type Day,
} from './domain';
import {
  qiblaAligned,
  gpsLocation,
  preferencesForLocation,
  liveHeading,
  cityMatches,
} from './locationSelection';
import {adapter, locate, onHeading, onPrayerTimeChanged} from './native';
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
import {adhanNative} from './sounds';
import {
  civilDate as sourceDate,
  clock as sourceClock,
  nextDate,
  tzVersion,
} from './time';
import {PrayerLandmark, QiblaCompass, OrnamentDivider} from './visuals';
import {
  Banner,
  Disclosure,
  Group,
  Ornament,
  RadioRow,
  SearchField,
  Segments,
  SettingRow,
  Toggle,
} from '../../design/components';
import {ltr} from '../../design/format';
import {Illustration} from '../../design/Illustration';
import {PanelArtwork} from '../../design/PanelArtwork';
import {
  Sheet,
  IconButton,
  AppIcon,
  AppText,
  Button,
  Card,
  Input,
  Page,
  Row,
  StateView,
  usePalette,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';
import {themeContext} from '../../store';

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
  const {digits, date: formatDate} = useFormat();
  const {prefs, tables, coverage, error, now, load} = usePrayer();
  const p = usePalette(),
    {mode, uiScale} = useContext(themeContext);
  const {fontScale, width} = useWindowDimensions();
  const expanded = fontScale * uiScale > 1.3;
  const showArtwork = !expanded && width >= 350;
  const [refreshing, setRefreshing] = useState(false);
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
  const humanDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? formatDate(new Date(date + 'T12:00:00Z'), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      })
    : date;
  const adhan = () => navigation.navigate('PrayerAdhan');
  return (
    <Page title="مواقيت الصلاة" contentStyle={visual.page}>
      <Status error={error} retry={load} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="المدينة والموقع"
        onPress={() => navigation.navigate('PrayerLocation')}
        style={({pressed}) => [
          visual.location,
          {
            backgroundColor: pressed ? p.surfaceMuted : p.surface,
            borderColor: p.borderSubtle,
          },
        ]}>
        <View style={[visual.iconCircle, {backgroundColor: p.surfaceMuted}]}>
          <AppIcon name="location" />
        </View>
        <View style={{flex: 1}}>
          <AppText role="sectionTitle">{l?.name ?? 'اختر مدينتك'}</AppText>
          <AppText role="caption" style={{color: p.textSecondary}}>
            {l ? humanDate : 'تعمل المدينة اليدوية دون إذن الموقع'}
          </AppText>
        </View>
        {showArtwork && mode === 'light' ? (
          <View style={{width: 72}}>
            <PrayerLandmark />
          </View>
        ) : (
          <AppIcon name="edit" size={20} />
        )}
      </Pressable>
      {next && l && (
        <View
          style={[
            visual.next,
            {backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle},
          ]}>
          <PanelArtwork color={p.accent} />
          <View style={{flex: 1, gap: 2}}>
            <AppText role="caption">الصلاة القادمة</AppText>
            <AppText role="bodyStrong">{labels[next.name]}</AppText>
            <AppText role="prayerTime" style={visual.time}>
              {digits(clock(l.zone, next.at, prefs.format))}
            </AppText>
            <AppText role="caption" style={{color: p.textSecondary}}>
              المتبقي{' '}
              {ltr(
                digits(
                  `${Math.floor(remaining / 3600)}:${String(Math.floor(remaining / 60) % 60).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`,
                ),
              )}
            </AppText>
          </View>
          {showArtwork && (
            <View style={{width: 100}}>
              <PrayerLandmark clock />
            </View>
          )}
        </View>
      )}
      {mode === 'dark' && <OrnamentDivider />}
      {today && l ? (
        <>
          <View
            style={[
              visual.timetable,
              {backgroundColor: p.surface, borderColor: p.borderSubtle},
            ]}>
            {today.rows.map((r, index) => {
              const selected = r.at === next?.at;
              const foreground = selected ? p.textOnSelection : p.textPrimary;
              const enabled =
                r.name !== 'sunrise' && prefs.modes[r.name] !== 'off';
              const allowed =
                enabled && coverage?.authorized && !coverage.blocked;
              const status = !enabled
                ? 'التنبيه متوقف'
                : !allowed
                  ? 'التنبيه محفوظ، الإذن أو القناة غير متاحين'
                  : prefs.modes[r.name as keyof typeof prefs.modes] ===
                        'full' &&
                      coverage?.exact &&
                      !coverage?.fullFallback
                    ? 'تشغيل الأذان'
                    : 'تنبيه إشعار، قد يؤخره توفير الطاقة';
              return (
                <View
                  key={r.name}
                  style={{
                    borderTopWidth:
                      index && !selected ? StyleSheet.hairlineWidth : 0,
                    borderColor: p.borderSubtle,
                  }}>
                  <View
                    style={[
                      visual.prayerRow,
                      {
                        backgroundColor: selected ? p.selection : undefined,
                        flexWrap: expanded ? 'wrap' : 'nowrap',
                      },
                    ]}>
                    <View
                      style={[
                        visual.prayerName,
                        expanded && {width: '100%', flex: undefined},
                      ]}>
                      <AppIcon
                        name={
                          r.name === 'sunrise'
                            ? 'sun'
                            : r.name === 'isha'
                              ? 'moon'
                              : 'mosque'
                        }
                        size={20}
                        color={selected ? p.textOnSelection : p.accent}
                      />
                      <AppText
                        role="bodyStrong"
                        style={{color: foreground, flexShrink: 1}}>
                        {labels[r.name]}
                      </AppText>
                    </View>
                    <AppText
                      role="bodyStrong"
                      style={[visual.time, {color: foreground, flexShrink: 1}]}>
                      {digits(clock(l.zone, r.at, prefs.format))}
                    </AppText>
                    {r.name === 'sunrise' ? (
                      <View
                        style={visual.bell}
                        accessible
                        accessibilityLabel="الشروق: وقت إرشادي بدون تنبيه"
                      />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${labels[r.name]}: ${status}. إعدادات التنبيه`}
                        onPress={adhan}
                        style={({pressed}) => [
                          visual.bell,
                          {opacity: pressed ? 0.6 : 1},
                        ]}>
                        <AppIcon
                          name={
                            enabled
                              ? allowed
                                ? 'bell'
                                : 'warning'
                              : 'bell-off'
                          }
                          size={22}
                          color={foreground}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="طريقة الحساب والتوقيت"
        onPress={() => navigation.navigate('PrayerCalculation')}
        style={({pressed}) => [
          visual.method,
          {
            backgroundColor: pressed ? p.surfaceMuted : p.surface,
            borderColor: p.borderSubtle,
          },
        ]}>
        <AppIcon name="settings" />
        <AppText role="caption" style={{flex: 1}}>
          طريقة الحساب:{' '}
          {prefs.method === 'habous'
            ? 'حصة الوزارة المغربية'
            : methods[prefs.method]}
        </AppText>
        <AppIcon name="chevron-left" size={18} />
      </Pressable>
      <View style={[visual.shortcuts, expanded && {flexDirection: 'column'}]}>
        {[
          {title: 'القبلة', icon: 'compass' as const, route: 'Qibla'},
          {
            title: 'إعدادات الأذان',
            icon: 'volume' as const,
            route: 'PrayerAdhan',
          },
        ].map(item => (
          <Pressable
            key={item.route}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => navigation.navigate(item.route)}
            style={({pressed}) => [
              visual.shortcut,
              {
                backgroundColor: pressed ? p.surfaceMuted : p.surface,
                borderColor: p.borderSubtle,
              },
            ]}>
            <AppIcon
              name={item.icon}
              color={mode === 'dark' ? p.accent : p.iconPrimary}
            />
            <AppText role="label" style={{flex: 1}}>
              {item.title}
            </AppText>
            <AppIcon name="chevron-left" size={16} />
          </Pressable>
        ))}
      </View>
      <AppText role="caption" style={{color: p.textSecondary}}>
        {prefs.method === 'habous'
          ? 'حصة محفوظة · وزارة الأوقاف والشؤون الإسلامية'
          : 'أوقات محسوبة وليست حصة الوزارة'}
      </AppText>
      {l?.cityId && prefs.method === 'habous' && (
        <>
          <AppText role="caption" style={{color: p.textSecondary}}>
            {table
              ? `الحصة محفوظة حتى ${ltr(Object.keys(table.dates).sort().at(-1)!)}`
              : 'الحصة غير محفوظة'}
          </AppText>
          <Button
            secondary
            label={refreshing ? 'جار تحديث الحصة' : 'تحديث حصة المدينة'}
            disabled={refreshing}
            onPress={() =>
              attempt(async () => {
                setRefreshing(true);
                try {
                  await refreshTable(l.cityId!);
                  await load();
                } finally {
                  setRefreshing(false);
                }
              })
            }
          />
        </>
      )}
      <Row
        title="مصادر المواقيت والموقع"
        icon="info"
        onPress={() => navigation.navigate('PrayerSources')}
      />
    </Page>
  );
}

export function LocationScreen({navigation}: any) {
  const {digits} = useFormat();
  const {prefs, error, load} = usePrayer(),
    [draft, setDraft] = useState({
      name: 'موقع يدوي',
      latitude: '',
      longitude: '',
      zone: 'Africa/Casablanca',
    }),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(''),
    [searchFocused, setSearchFocused] = useState(false),
    [choice, setChoice] = useState<Location | null>(null);
  const locationActive = useRef(false);
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
    useCallback(() => {
      locationActive.current = true;
      return () => {
        locationActive.current = false;
        adapter?.cancelLocation();
      };
    }, []),
  );
  const save = async (l: Location) => {
    if (!prefs) return;
    await savePreferences(preferencesForLocation(prefs, l));
    navigation.goBack();
  };
  return (
    <Page title="المدينة والموقع" onBack={() => navigation.goBack()}>
      <Status error={error} retry={load} />
      {!searchFocused && !query && (
        <>
          <View style={{alignItems: 'center', paddingVertical: 14}}>
            <AppIcon name="location" size={44} />
          </View>
          {prefs?.location && (
            <Banner
              icon="check"
              text={`الموقع المحفوظ: ${prefs.location.name}`}
            />
          )}
          <Button
            secondary
            label={
              busy
                ? 'جار تحديد الموقع'
                : prefs?.location?.source === 'gps'
                  ? 'تحديث موقعي المحفوظ'
                  : 'استخدام موقعي وحفظه'
            }
            disabled={busy || !prefs}
            onPress={() =>
              attempt(async () => {
                setBusy(true);
                try {
                  const result = await locate();
                  if (!locationActive.current) return;
                  const location = gpsLocation(
                    result,
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                  );
                  await save(location);
                } finally {
                  setBusy(false);
                }
              })
            }
          />
          <AppText role="caption" style={{textAlign: 'center'}}>
            يُحفظ الموقع للصلاة والقبلة. مواقيت الإحداثيات تُحسب بالطريقة
            المختارة؛ عند استخدام حصة الأوقاف ننتقل إلى رابطة العالم الإسلامي.
          </AppText>
          <Ornament title="أو اختر المدينة" />
        </>
      )}
      <SearchField
        label="ابحث عن مدينة"
        value={query}
        onChange={setQuery}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
      />
      <Group>
        {cities
          .filter(c => cityMatches(c.name, query))
          .map(c => (
            <RadioRow
              key={c.cityId}
              title={c.name}
              detail="المغرب"
              icon="location"
              selected={
                (choice?.cityId ?? prefs?.location?.cityId) === c.cityId
              }
              onPress={() =>
                setChoice({...c, source: 'city', acquiredAt: Date.now()})
              }
            />
          ))}
      </Group>
      <Banner text="يمكنك اختيار المدينة دون السماح بالموقع." />
      <Button
        label="حفظ المدينة"
        disabled={!prefs || !choice || busy}
        onPress={() => attempt(() => save(choice!))}
      />
      <Disclosure title="إحداثيات ومنطقة زمنية يدويا">
        {(['name', 'latitude', 'longitude', 'zone'] as const).map((k, i) => (
          <Input
            key={k}
            numeric={k === 'latitude' || k === 'longitude'}
            label={digits(
              [
                'اسم المكان',
                'خط العرض (-90 إلى 90)',
                'خط الطول (-180 إلى 180)',
                'المنطقة الزمنية، مثل Europe/Paris',
              ][i],
            )}
            value={draft[k]}
            autoCapitalize="none"
            onChangeText={v => {
              setDraft(d => ({...d, [k]: v}));
            }}
          />
        ))}
        <AppText role="caption">
          المنطقة الزمنية تخص المكان المختار، وقد تختلف عن منطقة جهازك. مثال
          آخر: Asia/Riyadh.
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
                source: 'manual',
                acquiredAt: Date.now(),
              });
            })
          }
        />
      </Disclosure>
    </Page>
  );
}

export function QiblaScreen({navigation}: any) {
  const {number} = useFormat();
  const {prefs, error, load} = usePrayer(),
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
  // Sensor events arrive more often than the one-second stale-reading timer.
  // Compare against the current clock, never the older timer snapshot.
  const live = liveHeading(heading, Date.now());
  const [aligned, setAligned] = useState(false);
  const wasAligned = useRef(false);
  const lastBuzz = useRef(0);
  useEffect(() => {
    const next =
      live &&
      target !== null &&
      !!heading &&
      qiblaAligned(target, heading.heading, wasAligned.current);
    if (next && !wasAligned.current && Date.now() - lastBuzz.current > 2000) {
      Vibration.vibrate(60);
      lastBuzz.current = Date.now();
    }
    wasAligned.current = next;
    setAligned(next);
  }, [live, heading, target]);
  return (
    <Page
      title="القبلة"
      onBack={() => navigation.goBack()}
      contentStyle={visual.page}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="المدينة والموقع"
            onPress={() => navigation.navigate('PrayerLocation')}
            style={({pressed}) => [
              visual.location,
              {
                backgroundColor: pressed ? p.surfaceMuted : p.surface,
                borderColor: p.borderSubtle,
              },
            ]}>
            <View
              style={[visual.iconCircle, {backgroundColor: p.surfaceMuted}]}>
              <AppIcon name="location" />
            </View>
            <AppText role="sectionTitle" style={{flex: 1}}>
              {l.name}
            </AppText>
          </Pressable>
          <View
            accessible
            accessibilityLabel={`اتجاه القبلة ${number(target, {minimumFractionDigits: 1, maximumFractionDigits: 1})} درجة من الشمال الحقيقي. ${live ? 'اتجاه حي نسبي لأعلى الجهاز' : 'مخطط ثابت، الشمال إلى أعلى'}`}>
            <QiblaCompass
              aligned={aligned && live}
              bearing={target}
              heading={live ? heading!.heading : null}
            />
          </View>
          <View
            style={[
              visual.bearing,
              {backgroundColor: p.surface, borderColor: p.borderSubtle},
            ]}>
            <AppText
              role="prayerTime"
              style={[visual.time, {textAlign: 'center'}]}>
              {number(target, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              °
            </AppText>
            <AppText
              role="caption"
              style={{textAlign: 'center', color: p.textSecondary}}>
              من الشمال الحقيقي
            </AppText>
          </View>
          <AppText
            role="bodyStrong"
            style={[visual.instruction, {backgroundColor: p.surfaceMuted}]}>
            {aligned && live
              ? 'أنت باتجاه القبلة'
              : live
                ? 'وجّه الهاتف نحو السهم'
                : 'مخطط ثابت: الشمال إلى أعلى'}
          </AppText>
          <View
            style={[
              visual.accuracy,
              {
                backgroundColor: live ? p.successSurface : p.warningSurface,
                borderColor: p.borderSubtle,
              },
            ]}>
            <AppText
              role="bodyStrong"
              style={{flex: 1, color: live ? p.success : p.warning}}>
              {aligned && live
                ? 'أنت باتجاه القبلة ✓'
                : live
                  ? 'قراءة البوصلة متاحة'
                  : heading
                    ? 'دقة منخفضة أو قراءة قديمة'
                    : state}
            </AppText>
            <AppIcon
              name={live ? 'check' : 'warning'}
              color={live ? p.success : p.warning}
            />
          </View>
          <Button
            label="معايرة البوصلة"
            icon="compass"
            onPress={() => navigation.navigate('QiblaCalibration')}
          />
          <View style={visual.guidance}>
            <AppIcon name="warning" size={20} color={p.accent} />
            <AppText role="caption" style={{flex: 1, color: p.textSecondary}}>
              ضع الجهاز بشكل مسطح بعيدا عن المعادن والأجهزة المغناطيسية.{' '}
              {live
                ? 'أعلى البوصلة يمثل أعلى الجهاز.'
                : 'استخدم زاوية القبلة مع الشمال الحقيقي.'}
            </AppText>
          </View>
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
    <Page
      title="معايرة البوصلة"
      onBack={() => navigation.goBack()}
      contentStyle={{flexGrow: 1}}>
      <Illustration name="qibla" height={230} />
      <AppText role="screenTitle" style={{textAlign: 'center'}}>
        حرّك الهاتف على شكل 8
      </AppText>
      <AppText role="caption" style={{textAlign: 'center'}}>
        أبعد الهاتف عن المعادن، ثم حركه بهدوء لتحسين دقة الاتجاه.
      </AppText>
      <Banner
        icon="compass"
        text="ارجع إلى القبلة للتحقق من القراءة الحية. المعايرة لا تضمن دقة الحساس؛ عند غيابه يبقى الاتجاه الرقمي متاحا."
      />
      <Row
        title="عرض الاتجاه في البوصلة"
        icon="compass"
        onPress={() => navigation.goBack()}
      />
      <View style={{flex: 1, minHeight: 20}} />
      <Button
        label="إعادة القياس"
        icon="reset"
        onPress={() => navigation.goBack()}
      />
      <Button
        secondary
        label="اختيار المدينة يدويا"
        onPress={() => navigation.navigate('PrayerLocation')}
      />
    </Page>
  );
}

export function CalculationScreen({navigation}: any) {
  const {number, digits} = useFormat();
  const {prefs, error, load} = usePrayer(),
    [draft, setDraft] = useState<Preferences | null>(null),
    [offsets, setOffsets] = useState<Record<string, string>>({}),
    [choosing, setChoosing] = useState(false);
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
          <Group>
            <SettingRow
              title="طريقة الحساب"
              detail={methods[draft.method]}
              icon="settings"
              onPress={() => setChoosing(true)}
            />
            <SettingRow
              title="الموقع"
              detail={draft.location?.name ?? 'اختر موقعك'}
              icon="location"
              onPress={() => navigation.navigate('PrayerLocation')}
            />
          </Group>
          <Sheet
            title="طريقة الحساب"
            visible={choosing}
            onClose={() => setChoosing(false)}>
            {Object.entries(methods).map(([id, label]) => (
              <RadioRow
                key={id}
                title={label}
                selected={draft.method === id}
                icon="mosque"
                onPress={() => {
                  setDraft({...draft, method: id as Preferences['method']});
                  setChoosing(false);
                }}
              />
            ))}
          </Sheet>
          {draft.method !== 'habous' && (
            <Disclosure title="خيارات الحساب المتقدمة">
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
            </Disclosure>
          )}
          <AppText role="sectionTitle">
            {digits('تعديل الدقائق (-30 إلى 30)')}
          </AppText>
          <Group>
            {events.map(n => (
              <SettingRow key={n} title={labels[n]}>
                <IconButton
                  name="minus"
                  label={'إنقاص ' + labels[n]}
                  disabled={Number(offsets[n]) <= -30}
                  onPress={() =>
                    setOffsets(o => ({
                      ...o,
                      [n]: String(Math.max(-30, Number(o[n]) - 1)),
                    }))
                  }
                />
                <AppText
                  style={{
                    minWidth: 24,
                    textAlign: 'center',
                    writingDirection: 'ltr',
                  }}>
                  {digits(offsets[n] ?? '0')}
                </AppText>
                <IconButton
                  name="plus"
                  label={'زيادة ' + labels[n]}
                  disabled={Number(offsets[n]) >= 30}
                  onPress={() =>
                    setOffsets(o => ({
                      ...o,
                      [n]: String(Math.min(30, Number(o[n]) + 1)),
                    }))
                  }
                />
              </SettingRow>
            ))}
          </Group>
          <Banner text="تطبق التعديلات مرة واحدة على المواقيت المعتمدة." />
          <Segments
            value={draft.format}
            options={[
              {value: '24', label: `${number(24)} ساعة`},
              {value: '12', label: `${number(12)} ساعة`},
            ]}
            onChange={format => setDraft({...draft, format})}
          />
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
  const {number, digits} = useFormat();
  const {prefs, coverage, error, load} = usePrayer(),
    [draft, setDraft] = useState<Preferences | null>(null),
    [pre, setPre] = useState('0'),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<(typeof prayers)[number] | null>(null);
  useEffect(() => {
    if (prefs) {
      setDraft(prefs);
      setPre(String(prefs.preMinutes));
    }
  }, [prefs]);
  return (
    <Page title="تنبيهات الصلاة والأذان" onBack={() => navigation.goBack()}>
      <Status error={error} retry={load} />
      <Row
        title="صوت الأذان"
        detail="التسجيل المختار ونسخة الفجر"
        icon="volume"
        onPress={() => navigation.navigate('PrayerSounds')}
      />
      {draft && (
        <>
          <Group>
            {prayers.map(n => (
              <SettingRow
                key={n}
                title={labels[n]}
                detail={
                  {
                    off: 'صامت',
                    notification: 'إشعار فقط',
                    full: 'تشغيل الأذان',
                  }[draft.modes[n]]
                }
                icon={n === 'isha' ? 'moon' : 'mosque'}>
                <IconButton
                  name="settings"
                  label={'نوع تنبيه ' + labels[n]}
                  onPress={() => setEditing(n)}
                />
                <Toggle
                  label={'تفعيل تنبيه ' + labels[n]}
                  value={draft.modes[n] !== 'off'}
                  onChange={enabled =>
                    setDraft({
                      ...draft,
                      modes: {
                        ...draft.modes,
                        [n]: enabled ? 'notification' : 'off',
                      },
                    })
                  }
                />
              </SettingRow>
            ))}
          </Group>
          <Sheet
            title={editing ? labels[editing] : ''}
            visible={editing !== null}
            onClose={() => setEditing(null)}>
            {editing &&
              (['off', 'notification', 'full'] as const).map(m => (
                <RadioRow
                  key={m}
                  title={
                    {
                      off: 'متوقف',
                      notification: 'إشعار فقط',
                      full: 'تشغيل الأذان',
                    }[m]
                  }
                  selected={draft.modes[editing] === m}
                  icon="bell"
                  onPress={() => {
                    setDraft({...draft, modes: {...draft.modes, [editing]: m}});
                    setEditing(null);
                  }}
                />
              ))}
          </Sheet>
          <Group>
            <SettingRow
              title="تنبيه قبل الصلاة"
              detail={digits('بالدقائق · 0 لإيقافه، حتى 30')}
              icon="bell">
              <IconButton
                name="minus"
                label="تقليل دقائق التذكير"
                disabled={Number(pre) <= 0}
                onPress={() => setPre(String(Math.max(0, Number(pre) - 1)))}
              />
              <AppText>{digits(pre)}</AppText>
              <IconButton
                name="plus"
                label="زيادة دقائق التذكير"
                disabled={Number(pre) >= 30}
                onPress={() => setPre(String(Math.min(30, Number(pre) + 1)))}
              />
            </SettingRow>
          </Group>
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
      <Disclosure title="الإذن والتغطية المحفوظة">
        <Card>
          <AppText>
            لتشغيل الأذان، اختر أحد الأصوات المرفقة ونسخة الفجر، ثم فعّل إذن
            المنبهات والإشعارات. إذا تعذر ذلك، يستخدم التطبيق إشعارا فقط ويحفظ
            اختيارك.
          </AppText>
          <AppText>
            {coverage?.backgroundRenewal
              ? 'تتجدد المواعيد في الخلفية عندما يسمح النظام. قد يؤخر توفير الطاقة التجديد والإشعارات. تظهر أدناه التغطية المحفوظة فعليا؛ بعد إيقاف التطبيق إجباريا افتحه لتجديدها.'
              : 'قد يؤخر توفير الطاقة الإشعار. افتح التطبيق لتجديد المواعيد؛ التجديد في الخلفية غير متاح على هذا الجهاز.'}
          </AppText>
        </Card>
        <AppText>
          {coverage?.authorized && !coverage.blocked
            ? 'إذن الإشعارات متاح'
            : 'إذن الإشعارات أو القناة غير مفعل'}
        </AppText>
        <AppText role="caption">
          {coverage && prefs?.location
            ? `${number(coverage.scheduled)} إشعارات مجدولة · التغطية حتى ${digits(civilDate(prefs.location.zone, coverage.coveredUntil))} ${digits(clock(prefs.location.zone, coverage.coveredUntil))}`
            : 'لا توجد تغطية مجدولة'}
        </AppText>
        <Button
          secondary
          label="إعدادات الإشعارات في الجهاز"
          onPress={() => attempt(openPrayerSettings)}
        />
        <AppText>{`أذان صوتي مجدول: ${number(coverage?.fullAdhan ?? 0)} · إشعار بديل: ${number(coverage?.fullFallback ?? 0)}`}</AppText>
        <Button
          secondary
          label="إذن المنبهات والتذكيرات"
          onPress={() =>
            attempt(async () => {
              await adhanNative()?.openAdhanAlarms();
            })
          }
        />
      </Disclosure>
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

export {SoundsScreen} from './SoundsScreen';

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

const visual = StyleSheet.create({
  page: {gap: 10, paddingTop: 8, paddingHorizontal: 16},
  location: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: {
    overflow: 'hidden',
    minHeight: 136,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  time: {
    writingDirection: 'ltr',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  timetable: {
    borderRadius: 16,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  prayerRow: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  prayerName: {
    flex: 1,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  bell: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  method: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    padding: 10,
  },
  shortcuts: {flexDirection: 'row-reverse', direction: 'ltr', gap: 10},
  shortcut: {
    flex: 1,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    padding: 10,
  },
  bearing: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  instruction: {textAlign: 'center', padding: 12, borderRadius: 12},
  accuracy: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  guidance: {
    flexDirection: 'row-reverse',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
    padding: 8,
  },
});
