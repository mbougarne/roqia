import React, {useState} from 'react';
import {AppText, Button, Card, Page, StateView} from '../design/ui';
import {Illustration} from '../design/Illustration';
import {number, ltr} from '../design/format';
import {noteData} from '../data';
const slides = [
  {
    title: 'مرحبا بك في رقية',
    body: 'الرقية والأذكار والأدعية، معك دون اتصال. تطبيق مجاني بلا إعلانات أو حساب.',
    art: 'quran-book',
  },
  {
    title: 'اقرأ واستمع',
    body: 'استمع لذكر واحد أو شغّل قائمة الصفحة. يمكنك متابعة التصفح مع المشغل المصغر.',
    art: 'listening',
  },
  {
    title: 'كل ما تحتاجه في مكان واحد',
    body: 'تنقل بين الرقية والأذكار والمزيد. القرآن والصلاة سيصبحان متاحين بعد استكمال التحقق.',
    art: 'quran-book',
  },
  {
    title: 'وردك اليومي',
    body: 'اضغط على زر العداد بعد القراءة. يبقى تقدمك محفوظا حتى تعيد العداد بنفسك.',
    art: 'morning',
  },
  {
    title: 'على راحتك',
    body: 'اختر المظهر وحجم الواجهة من الإعدادات. التذكيرات اختيارية ويمكن ضبطها لاحقا.',
    art: 'evening',
  },
] as const;
export function Guide({onFinish}: {onFinish: () => void}) {
  const [step, setStep] = useState(0),
    slide = slides[step];
  return (
    <Page
      title={slide.title}
      onBack={step ? () => setStep(step - 1) : undefined}>
      <Illustration name={slide.art} height={220} />
      <AppText>{slide.body}</AppText>
      <AppText role="caption">
        {ltr(`${number(step + 1)} / ${number(slides.length)}`)}
      </AppText>
      <Button
        label={step === slides.length - 1 ? 'لنبدأ' : 'التالي'}
        onPress={() =>
          step === slides.length - 1 ? onFinish() : setStep(step + 1)
        }
      />
      <Button secondary label="تخطي الدليل" onPress={onFinish} />
    </Page>
  );
}
export function Guidance({onFinish}: {onFinish: () => void}) {
  return (
    <Page title={noteData.title}>
      <Illustration name="quran-book" height={120} />
      <Card>
        <AppText selectable>{noteData.content}</AppText>
      </Card>
      <Button label="متابعة" onPress={onFinish} />
    </Page>
  );
}
export function GuideScreen({navigation}: any) {
  return <Guide onFinish={() => navigation.goBack()} />;
}
export function GuidanceScreen({navigation}: any) {
  return <Guidance onFinish={() => navigation.goBack()} />;
}
export function HydrationScreen() {
  return (
    <Page title="رقية">
      <Illustration name="quran-book" height={220} />
      <StateView
        busy
        title="جار تجهيز التطبيق"
        description="استرجاع إعداداتك وتقدمك المحفوظ"
      />
    </Page>
  );
}
