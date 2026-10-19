import React, {useState} from 'react';
import {AccessibilityInfo, Linking, Modal, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
import {
  Banner,
  Disclosure,
  Group,
  Ornament,
  SettingRow,
} from '../design/components';
import {editions} from '../features/quran/domain';
import {Illustration} from '../design/Illustration';
import {noteData} from '../data';
import legal from '../features/settings/legal-copy.json';
import {source as asmaSource} from '../features/asma/content';
export function AboutScreen({navigation}: any) {
  const p = usePalette();
  const external = (title: string, url: string) =>
    navigation.navigate('ExternalLink', {title, url});
  return (
    <Page title="حول التطبيق" onBack={() => navigation.goBack()}>
      <Card style={{alignItems: 'center', gap: 8, paddingVertical: 24}}>
        <AppIcon name="medallion" size={64} color={p.accent} />
        <AppText role="screenTitle">الرقية</AppText>
        <AppText role="caption">رفيقك للرقية والأذكار والقرآن</AppText>
      </Card>
      <Group>
        <SettingRow
          title="مجاني بالكامل"
          detail="بلا إعلانات أو اشتراكات"
          icon="medallion"
        />
        <SettingRow
          title="من القلب"
          detail="تطبيق يساعدك على القراءة والذكر والاستماع في أي وقت."
          icon="book"
        />
      </Group>
      <Row
        title="التواصل عبر البريد"
        detail={noteData.email}
        icon="mail"
        onPress={() =>
          external('التواصل عبر البريد', `mailto:${noteData.email}`)
        }
      />
      <Row
        title="المشروع مفتوح المصدر"
        icon="external"
        onPress={() => external('المشروع مفتوح المصدر', noteData.githubRepoUrl)}
      />
      <Row
        title="صفحة المطور"
        icon="external"
        onPress={() => external('صفحة المطور', noteData.authorGithubUrl)}
      />
      <Row
        title="المصادر"
        icon="book"
        onPress={() => navigation.navigate('Sources')}
      />
      <Row
        title="سياسة الخصوصية"
        onPress={() => navigation.navigate('Privacy')}
      />
      <Row
        title="شروط الاستخدام"
        onPress={() => navigation.navigate('Terms')}
      />
    </Page>
  );
}
export function LegalScreen({navigation, route}: any) {
  const privacy = route.name === 'Privacy';
  return (
    <Page
      title={privacy ? 'سياسة الخصوصية' : 'شروط الاستخدام'}
      onBack={() => navigation.goBack()}>
      <Ornament />
      <AppText role="sectionTitle" style={{textAlign: 'center'}}>
        {privacy ? 'خصوصيتك أولا' : 'استخدام التطبيق'}
      </AppText>
      {(privacy
        ? [
            ['على جهازك', 'نحفظ اختياراتك وتقدمك محليا على جهازك.', 'storage'],
            [
              'الموقع',
              'يستخدم لتحديد القبلة ومواقيت الصلاة؛ يمكنك اختيار المدينة يدويا.',
              'location',
            ],
            [
              'التنزيلات',
              'المحتوى الاختياري يحتاج إلى اتصال بمصدره، ثم يعمل دون اتصال.',
              'download',
            ],
            [
              'بدون حساب',
              'لا تحتاج إلى إنشاء حساب لاستخدام التطبيق.',
              'shield',
            ],
          ]
        : [
            [
              'استخدام التطبيق',
              'التطبيق مجاني ومتاح للقراءة والذكر والاستماع.',
              'book',
            ],
            [
              'المحتوى والمصادر',
              'تظهر مصادر النصوص والترجمات والتلاوات داخل التطبيق.',
              'info',
            ],
            [
              'النسخ والتحديثات',
              'يمكن الاطلاع على معلومات الإصدار والمصدر.',
              'reset',
            ],
            ['التواصل', 'أبلغنا عن أي خطأ أو ملاحظة.', 'mail'],
          ]
      ).map(([title, detail, icon]) => (
        <Card key={title} style={{paddingVertical: 20, paddingHorizontal: 4}}>
          <SettingRow title={title} detail={detail} icon={icon as any} />
        </Card>
      ))}
      <Disclosure
        title={
          privacy
            ? 'قراءة السياسة الكاملة دون اتصال'
            : 'قراءة الشروط الكاملة دون اتصال'
        }>
        <AppText selectable>{legal[privacy ? 'Privacy' : 'Terms']}</AppText>
      </Disclosure>
      <Button
        secondary
        label="فتح الصفحة المنشورة"
        onPress={() =>
          navigation.navigate('ExternalLink', {
            title: privacy ? 'سياسة الخصوصية' : 'شروط الاستخدام',
            url: privacy ? noteData.policyUrl : noteData.termsUrl,
          })
        }
      />
    </Page>
  );
}
export function SourcesScreen({navigation}: any) {
  return (
    <Page title="المصادر" onBack={() => navigation.goBack()}>
      <AppText role="caption" style={{textAlign: 'center'}}>
        تعرف على مصدر كل محتوى
      </AppText>
      {editions.map(e => (
        <Group key={e.id}>
          <SettingRow
            title={e.title}
            detail={e.publisher}
            icon="book"
            onPress={() =>
              navigation.navigate('QuranSource', {editionId: e.id})
            }
          />
        </Group>
      ))}
      {[
        ['الأذكار', noteData.audioSourceOneUrl],
        ['القرآن الصوتي', noteData.audioSourceTwoUrl],
        ['لهجاتي', noteData.audioSourceThreeUrl],
        ['الأدعية', noteData.duaaSourceUrl],
        ['التسبيحات', noteData.tasbihatSourceUrl],
        [asmaSource.title, asmaSource.url],
      ].map(([title, url]) => (
        <Row
          key={url}
          title={title}
          detail={url}
          icon="external"
          onPress={() => navigation.navigate('ExternalLink', {title, url})}
        />
      ))}
      <Banner text="النص والخط الأصلي لكل مصحف محفوظان معا. لا تعني إتاحة المصدر اعتماد التطبيق من الناشر." />
    </Page>
  );
}
export function ExternalLinkScreen({route, navigation}: any) {
  const {url, title} = route.params,
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
  const p = usePalette();
  async function open() {
    setBusy(true);
    setFailed(false);
    try {
      if (!/^(https:\/\/|mailto:)/.test(url)) throw new Error('invalid_link');
      await Linking.openURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={title} onBack={() => navigation.goBack()}>
      <AppText selectable style={{writingDirection: 'ltr', textAlign: 'left'}}>
        {url}
      </AppText>
      <AppText>
        يفتح الرابط في تطبيق خارجي. قد يحتاج إلى الإنترنت أو تطبيق بريد مثبت.
      </AppText>
      <Modal
        visible={failed}
        transparent
        onRequestClose={() => setFailed(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: p.scrim,
            justifyContent: 'center',
            padding: 32,
          }}>
          <Card>
            <View style={{alignItems: 'center'}}>
              <AppIcon name="external" size={48} color={p.accent} />
            </View>
            <AppText role="sectionTitle" style={{textAlign: 'center'}}>
              تعذر فتح الرابط
            </AppText>
            <AppText role="caption" style={{textAlign: 'center'}}>
              تحقق من الاتصال أو حاول مرة أخرى لاحقا.
            </AppText>
            <Button label="إعادة المحاولة" onPress={() => void open()} />
            <Button
              secondary
              icon="copy"
              label="نسخ الرابط"
              onPress={() => {
                Clipboard.setString(url);
                AccessibilityInfo.announceForAccessibility('تم نسخ الرابط');
              }}
            />
            <Button secondary label="إغلاق" onPress={() => setFailed(false)} />
          </Card>
        </View>
      </Modal>
      <Button
        label={failed ? 'إعادة المحاولة' : 'فتح الرابط'}
        disabled={busy}
        onPress={() => {
          void open();
        }}
      />
      <Button
        secondary
        label="نسخ الرابط"
        icon="copy"
        onPress={() => {
          Clipboard.setString(url);
          AccessibilityInfo.announceForAccessibility('تم نسخ الرابط');
        }}
      />
    </Page>
  );
}
