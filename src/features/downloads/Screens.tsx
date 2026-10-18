import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Alert} from 'react-native';
import {AppText, Button, Card, Page, StateView} from '../../design/ui';
import {bytes, ltr, number} from '../../design/format';
import {downloads, nativeDownloadPorts, startDownloadServices} from './native';
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
  const revision = useSyncExternalStore(
      downloads.subscribe,
      downloads.snapshot,
    ),
    [error, setError] = useState(false),
    [ready, setReady] = useState(false);
  const retry = () => {
    setError(false);
    void startDownloadServices()
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
  const {error, ready, retry} = useDownloads(),
    jobs = downloads
      .listJobs()
      .filter(j => !['removed', 'cancelled'].includes(j.state));
  return (
    <Page title="التنزيلات" onBack={() => navigation.goBack()}>
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
          description="ستظهر هنا الحزم المتاحة بعد اكتمال مراجعة مصادرها. محتوى الرقية والأذكار الموجود يعمل دون اتصال."
        />
      ) : (
        jobs.map(job => (
          <Card key={job.jobId}>
            <AppText role="bodyStrong">{job.packId}</AppText>
            <AppText accessibilityLiveRegion="polite">
              {labels[job.state]}
            </AppText>
            <AppText style={{writingDirection: 'ltr'}}>
              {displayBytes(job.bytesReceived)} /{' '}
              {displayBytes(job.expectedBytes)}
            </AppText>
            {job.state === 'paused_user' && (
              <AppText role="caption">
                تستأنف المحاولة من البداية لضمان سلامة الملف.
              </AppText>
            )}
            {job.state === 'failed' && (
              <AppText>لم يتم اعتماد هذا الملف. يمكنك إعادة المحاولة.</AppText>
            )}
            {['paused_user', 'failed'].includes(job.state) ? (
              <Button
                label="إعادة المحاولة"
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
    </Page>
  );
}
export function StorageScreen({navigation}: any) {
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
            <AppText>الملفات المثبتة: {displayBytes(usage.installed)}</AppText>
            <AppText>الملفات المؤقتة: {displayBytes(usage.partial)}</AppText>
            <AppText>المساحة المتاحة: {displayBytes(usage.free)}</AppText>
          </Card>
          {!packs.length && (
            <StateView
              title="لا توجد حزم منزّلة"
              description="المقاطع المرفقة بالتطبيق محفوظة للاستخدام دون اتصال، ولا تحذف من هذه الصفحة."
            />
          )}
          {packs.map(pack => (
            <Button
              key={key(pack)}
              secondary={!selected.includes(key(pack))}
              label={`${selected.includes(key(pack)) ? '✓ ' : ''}${pack.packId} · ${displayBytes(sizes[key(pack)] ?? 0)}`}
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
