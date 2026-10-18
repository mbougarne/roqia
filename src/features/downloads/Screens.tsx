import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Alert, View} from 'react-native';
import {
  Banner,
  Disclosure,
  Group,
  Ornament,
  Progress,
  RadioRow,
  Segments,
  SettingRow,
  rtlRow,
} from '../../design/components';
import {
  AppIcon,
  AppText,
  Button,
  Card,
  IconButton,
  Page,
  Row,
  StateView,
} from '../../design/ui';
import {bytes, ltr, number} from '../../design/format';
import {nativeDownloadPorts} from './native';
import {catalog} from './catalog';
const packTitle = (id: string) => catalog.find(p => p.id === id)?.title ?? id;
import {useQuran} from '../quran/context';
import {type DownloadState, type InstalledPack} from './types';
const displayBytes = (value: number) => ltr(bytes(value));
const labels: Record<DownloadState, string> = {
  queued: 'في الانتظار',
  waiting_network: 'بانتظار الشبكة المسموحة',
  downloading: 'جارٍ التنزيل',
  paused_user: 'أوقفته مؤقتاً',
  verifying: 'جارٍ التحقق',
  installing: 'جارٍ التثبيت',
  ready: 'جاهز دون اتصال',
  failed: 'تعذر التنزيل',
  cancelled: 'ملغى',
  deleting: 'جارٍ الحذف',
  removed: 'محذوف',
};
function useDownloads() {
  const runtime = useQuran(),
    downloads = runtime.downloads;
  const revision = useSyncExternalStore(
      downloads.subscribe,
      downloads.snapshot,
    ),
    [error, setError] = useState(false),
    [ready, setReady] = useState(false);
  const retry = () => {
    setError(false);
    void runtime
      .initialize()
      .then(() => setReady(true))
      .catch(() => setError(true));
  };
  useEffect(retry, []);
  return {
    revision,
    error: error || downloads.getError() !== null,
    ready,
    retry,
  };
}
const handle = (action: Promise<unknown>) => {
  void action.catch(() =>
    Alert.alert(
      'تعذر إتمام العملية',
      'حاول مرة أخرى. المحتوى المحفوظ يبقى مستقلاً عن هذه العملية.',
    ),
  );
};
export function DownloadsScreen({navigation}: any) {
  const runtime = useQuran(),
    downloads = runtime.downloads;
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const {error, ready, retry} = useDownloads(),
    jobs = downloads
      .listJobs()
      .filter(j => !['removed', 'cancelled'].includes(j.state));
  return (
    <Page title="التنزيلات" onBack={() => navigation.goBack()}>
      <Segments
        value={tab}
        options={[
          {value: 'active', label: 'قيد التنزيل'},
          {value: 'done', label: 'المكتملة'},
        ]}
        onChange={setTab}
      />
      {jobs.some(j => j.state === 'waiting_network') && (
        <Banner warning icon="wifi" text="بانتظار الاتصال بالشبكة المسموحة" />
      )}
      {ready &&
        !error &&
        !jobs.some(j =>
          tab === 'done' ? j.state === 'ready' : j.state !== 'ready',
        ) && (
          <StateView
            title={
              tab === 'done'
                ? 'لا توجد تنزيلات مكتملة'
                : 'لا توجد تنزيلات قيد التنفيذ'
            }
            action={
              tab === 'active'
                ? {label: 'عرض الملفات المكتملة', onPress: () => setTab('done')}
                : undefined
            }
          />
        )}
      {error ? (
        <StateView
          title="تعذر فتح التنزيلات"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      ) : !ready ? (
        <StateView title="جارٍ استرجاع التنزيلات" busy />
      ) : !jobs.length ? (
        <StateView
          title="لا توجد تنزيلات"
          description="اختر مصحفك من مكتبة القرآن لتنزيله وقراءته دون اتصال."
        />
      ) : (
        jobs
          .filter(j =>
            tab === 'done' ? j.state === 'ready' : j.state !== 'ready',
          )
          .map(job => (
            <Card key={job.jobId}>
              <SettingRow
                title={packTitle(job.packId)}
                icon={job.assetId === 'source-font' ? 'text-size' : 'download'}
              />
              <Progress
                value={
                  job.expectedBytes ? job.bytesReceived / job.expectedBytes : 0
                }
              />
              {['source-font', 'original'].includes(job.assetId) && (
                <AppText role="caption">
                  {job.assetId === 'source-font' ? 'الخط' : 'ملف المصحف الأصلي'}
                </AppText>
              )}
              {runtime.catalog.texts
                .filter(
                  t => t.pack.id === job.packId && runtime.installed(t.pack),
                )
                .map(t => (
                  <Button
                    key={t.editionId}
                    label="فتح المصحف"
                    onPress={() =>
                      navigation.navigate('QuranReader', {
                        editionId: t.editionId,
                        surah: 1,
                        verse: 1,
                        packVersion: t.pack.version,
                      })
                    }
                  />
                ))}
              <AppText role="caption">{labels[job.state]}</AppText>
              <AppText style={{writingDirection: 'ltr'}}>
                {displayBytes(job.bytesReceived)} /{' '}
                {displayBytes(job.expectedBytes)}
              </AppText>
              {job.state === 'paused_user' && (
                <AppText role="caption">
                  يبقى التنزيل متوقفاً حتى تختار المتابعة. يُستأنف من الجزء
                  المحفوظ عندما يسمح المصدر بذلك.
                </AppText>
              )}
              {[
                'server_restarted',
                'range_invalid',
                'entity_changed',
                'range_not_satisfiable',
              ].includes(job.errorCode ?? '') && (
                <AppText role="caption">
                  أُعيد التنزيل من البداية لأن المصدر لم يؤكد سلامة الجزء
                  المحفوظ.
                </AppText>
              )}
              {job.state === 'failed' && (
                <AppText>
                  {job.errorCode === 'insufficient_space'
                    ? 'لا توجد مساحة كافية. حرّر مساحة ثم أعد المحاولة.'
                    : 'لم يتم اعتماد هذا الملف. يمكنك إعادة المحاولة.'}
                </AppText>
              )}
              {job.state === 'failed' &&
                job.errorCode === 'insufficient_space' && (
                  <Button
                    secondary
                    label="إدارة التخزين"
                    onPress={() => navigation.navigate('Storage')}
                  />
                )}
              {job.state === 'waiting_network' &&
                job.consentNetworkPolicy === 'wifi' && (
                  <Button
                    secondary
                    label="السماح بأي شبكة لهذا الملف"
                    onPress={() =>
                      Alert.alert(
                        'التنزيل عبر بيانات الهاتف؟',
                        'قد يستهلك بيانات الهاتف. يبدأ هذا الملف من البداية، وتبقى التنزيلات الأخرى على Wi-Fi.',
                        [
                          {text: 'إلغاء', style: 'cancel'},
                          {
                            text: 'السماح',
                            onPress: () =>
                              handle(downloads.allowAnyNetwork(job.jobId)),
                          },
                        ],
                      )
                    }
                  />
                )}
              {['paused_user', 'failed'].includes(job.state) ? (
                <Button
                  label={
                    job.state === 'paused_user'
                      ? 'متابعة التنزيل'
                      : 'إعادة المحاولة'
                  }
                  onPress={() => handle(downloads.resume(job.jobId))}
                />
              ) : ['queued', 'waiting_network', 'downloading'].includes(
                  job.state,
                ) ? (
                <Button
                  label="إيقاف مؤقت"
                  onPress={() => handle(downloads.pause(job.jobId))}
                />
              ) : null}
              {!['ready', 'deleting'].includes(job.state) && (
                <Button
                  label="إلغاء التنزيل"
                  secondary
                  onPress={() => handle(downloads.cancel(job.jobId))}
                />
              )}
            </Card>
          ))
      )}
      <Row
        title="إدارة التخزين"
        icon="storage"
        onPress={() => navigation.navigate('Storage')}
      />
    </Page>
  );
}
export function StorageScreen({navigation}: any) {
  const downloads = useQuran().downloads;
  const {revision, error, ready, retry} = useDownloads(),
    [usage, setUsage] = useState({installed: 0, partial: 0, free: 0}),
    [selected, setSelected] = useState<string[]>([]),
    [sizes, setSizes] = useState<Record<string, number>>({});
  const packs = downloads.listInstalled(),
    key = (p: InstalledPack) => `${p.packId}@${p.version}`;
  useEffect(() => {
    if (!ready) return;
    void Promise.all([
      downloads.usage(),
      Promise.all(
        downloads
          .listInstalled()
          .map(
            async p =>
              [
                key(p),
                (
                  await Promise.all(
                    p.files.map(file => nativeDownloadPorts.size(file)),
                  )
                ).reduce((a, b) => a + b, 0),
              ] as const,
          ),
      ),
    ])
      .then(([u, s]) => {
        setUsage(u);
        setSizes(Object.fromEntries(s));
      })
      .catch(() => Alert.alert('تعذر قراءة مساحة التخزين'));
  }, [revision, ready]);
  const chosen = packs.filter(p => selected.includes(key(p))),
    total = chosen.reduce((n, p) => n + (sizes[key(p)] ?? 0), 0);
  return (
    <Page title="إدارة التخزين" onBack={() => navigation.goBack()}>
      {error ? (
        <StateView
          title="تعذر قراءة التخزين"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      ) : !ready ? (
        <StateView title="جارٍ قراءة التخزين" busy />
      ) : (
        <>
          <Card>
            <View style={{...rtlRow, justifyContent: 'space-between'}}>
              <View style={{flex: 1}}>
                <AppText role="label">المساحة المستخدمة</AppText>
                <AppText role="screenTitle" style={{writingDirection: 'ltr'}}>
                  {displayBytes(usage.installed)}
                </AppText>
              </View>
              <AppIcon name="storage" size={42} />
            </View>
            <Progress
              value={usage.installed / (usage.installed + usage.free || 1)}
            />
            <AppText>الملفات المؤقتة: {displayBytes(usage.partial)}</AppText>
            <AppText>المساحة المتاحة: {displayBytes(usage.free)}</AppText>
          </Card>
          {!packs.length && (
            <StateView
              title="لا توجد حزم منزّلة"
              description="المقاطع المرفقة بالتطبيق محفوظة للاستخدام دون اتصال، ولا تحذف من هذه الصفحة."
            />
          )}
          <Ornament title="المحتوى المحفوظ" />
          {packs.map(pack => (
            <RadioRow
              multiple
              key={key(pack)}
              title={packTitle(pack.packId)}
              detail={displayBytes(sizes[key(pack)] ?? 0)}
              icon={pack.capabilities.includes('audio') ? 'headphones' : 'book'}
              selected={selected.includes(key(pack))}
              onPress={() =>
                setSelected(s =>
                  s.includes(key(pack))
                    ? s.filter(k => k !== key(pack))
                    : [...s, key(pack)],
                )
              }
            />
          ))}
          {!!chosen.length && (
            <Button
              danger
              label={`حذف ${number(chosen.length)} · ${displayBytes(total)}`}
              icon="trash"
              onPress={() =>
                Alert.alert(
                  'حذف الملفات المحددة؟',
                  `سيتم تحرير ${displayBytes(total)} وإيقاف الصوت الذي يستخدمها. تبقى العلامات والعدادات محفوظة.`,
                  [
                    {text: 'إلغاء', style: 'cancel'},
                    {
                      text: 'حذف',
                      style: 'destructive',
                      onPress: () =>
                        handle(
                          (async () => {
                            for (const pack of chosen)
                              await downloads.deletePack(
                                pack.packId,
                                pack.version,
                              );
                            setSelected([]);
                          })(),
                        ),
                    },
                  ],
                )
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
