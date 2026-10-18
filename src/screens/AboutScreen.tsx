import React, {useState} from 'react';
import {AccessibilityInfo, Linking} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {AppText, Button, Card, Page, Row, StateView} from '../design/ui';
import {Illustration} from '../design/Illustration';
import {noteData} from '../data';
import legal from '../features/settings/legal-copy.json';
export function AboutScreen({navigation}: any) {
  const external = (title: string, url: string) =>
    navigation.navigate('ExternalLink', {title, url});
  return (
    <Page title="حول التطبيق" onBack={() => navigation.goBack()}>
      <Illustration name="quran-book" height={140} />
      <AppText role="screenTitle">رقية</AppText>
      <AppText selectable>{noteData.contact}</AppText>
      <AppText>Mourad Bougarne</AppText>
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
      <AppText role="caption">
        نسخة محلية للقراءة دون اتصال · 2026-10-18
      </AppText>
      <AppText selectable>{legal[privacy ? 'Privacy' : 'Terms']}</AppText>
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
      <AppText>مصادر المحتوى والصوت الحالي</AppText>
      {[
        ['الأذكار', noteData.audioSourceOneUrl],
        ['القرآن الصوتي', noteData.audioSourceTwoUrl],
        ['لهجاتي', noteData.audioSourceThreeUrl],
        ['الأدعية', noteData.duaaSourceUrl],
        ['التسبيحات', noteData.tasbihatSourceUrl],
      ].map(([title, url]) => (
        <Row
          key={url}
          title={title}
          detail={url}
          icon="external"
          onPress={() => navigation.navigate('ExternalLink', {title, url})}
        />
      ))}
      <Card>
        <AppText>حزم القرآن الجديدة</AppText>
        <AppText>
          ورش: حزمة مجمع الملك فهد مع خطها المطابق. لن تتاح الحزم قبل إتمام
          التحقق من النص والخط وحقوق التوزيع. لا يستخدم التطبيق خط المغرب مع نص
          المجمع.
        </AppText>
      </Card>
    </Page>
  );
}
export function ExternalLinkScreen({route, navigation}: any) {
  const {url, title} = route.params,
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
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
      {failed && (
        <StateView
          title="تعذر فتح الرابط"
          description="تحقق من الاتصال والتطبيق المناسب، أو انسخ الرابط وافتحه لاحقا."
        />
      )}
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
