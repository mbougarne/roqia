import React, {useContext, useState} from 'react';
import {View} from 'react-native';
import {AppIcon, AppText, Button, Card, Page, usePalette} from '../design/ui';
import {Illustration} from '../design/Illustration';
import {
  Banner,
  Group,
  Ornament,
  Segments,
  SettingRow,
  Range,
  rtlRow,
} from '../design/components';
import {themeContext} from '../store';
import {number} from '../design/format';
import {noteData} from '../data';
const slides = [
  ['مرحبا بك في الرقية', 'الرقية والأذكار والقرآن في مكان واحد'],
  ['اقرأ واستمع', 'استمع للنص وأكمل من حيث توقفت'],
  ['كل ما تحتاجه قريب', 'الأدعية والتسبيحات والإعدادات في المزيد'],
  ['أذكارك على مهل', 'اضغط بعد القراءة لتتبع التكرار'],
  ['اجعله مناسبا لك', 'يمكنك تعديل اختياراتك لاحقا'],
];
export function Guide({onFinish}: {onFinish: () => void}) {
  const [step, setStep] = useState(0),
    [sample, setSample] = useState(3);
  const {preference, setPreference, uiScale, setUiScale} =
      useContext(themeContext),
    p = usePalette();
  return (
    <Page
      title=""
      onBack={step ? () => setStep(step - 1) : undefined}
      actions={<Button compact secondary label="تخطي" onPress={onFinish} />}
      contentStyle={{flexGrow: 1, gap: 16}}>
      {step < 2 ? (
        <Illustration
          name={step === 0 ? 'quran-book' : 'listening'}
          height={180}
        />
      ) : (
        <Ornament />
      )}
      {step > 1 && (
        <AppText role="caption" style={{textAlign: 'center'}}>
          {number(step + 1)} / 5
        </AppText>
      )}
      <AppText role="screenTitle" style={{textAlign: 'center'}}>
        {slides[step][0]}
      </AppText>
      <AppText
        role="caption"
        style={{textAlign: 'center', color: p.textSecondary}}>
        {slides[step][1]}
      </AppText>
      {step === 0 && (
        <Group>
          <SettingRow
            title="مجاني بالكامل"
            detail="جميع المحتويات متاحة دون اشتراك"
            icon="medallion"
          />
          <SettingRow
            title="بلا إعلانات"
            detail="تجربة هادئة ومريحة"
            icon="shield"
          />
          <SettingRow
            title="اقرأ دون اتصال"
            detail="المحتوى المحفوظ معك في أي وقت"
            icon="download"
          />
        </Group>
      )}
      {step === 1 && (
        <>
          <Card>
            <SettingRow
              title="الرقية الشرعية"
              detail="استماع واحد أو تشغيل القائمة"
              icon="headphones"
            />
            <Ornament />
            <AppText style={{textAlign: 'center'}}>
              يمكنك متابعة القراءة والتصفح مع المشغل المصغر.
            </AppText>
          </Card>
          <Banner
            icon="download"
            text="حمّل التلاوات التي تختارها للاستماع دون اتصال."
          />
        </>
      )}
      {step === 2 && (
        <Group>
          {[
            ['الرقية', 'headphones'],
            ['القرآن', 'book'],
            ['الأذكار', 'tasbih'],
            ['الصلاة', 'mosque'],
            ['المزيد', 'more'],
          ].map(([title, icon]) => (
            <SettingRow key={title} title={title} icon={icon as any} />
          ))}
        </Group>
      )}
      {step === 3 && (
        <>
          <Card style={{paddingVertical: 24}}>
            <Ornament />
            <AppText role="devotional" style={{textAlign: 'center'}}>
              سبحان الله وبحمده
            </AppText>
            <AppText role="counter" style={{textAlign: 'center'}}>
              {number(sample)} / 3
            </AppText>
            <Button
              label={sample ? 'تمت القراءة' : 'اكتمل المثال'}
              disabled={!sample}
              onPress={() => setSample(n => Math.max(0, n - 1))}
            />
          </Card>
          <Group>
            <SettingRow
              title="الصباح · المساء · قبل النوم"
              icon="sun"
              detail="يبقى تقدمك محفوظا حتى تعيد العداد"
            />
          </Group>
        </>
      )}
      {step === 4 && (
        <>
          <Card>
            <Ornament title="المظهر" />
            <Segments
              value={preference}
              options={[
                {value: 'light', label: 'فاتح'},
                {value: 'dark', label: 'داكن'},
                {value: 'system', label: 'حسب الجهاز'},
              ]}
              onChange={setPreference}
            />
            <Range
              label="حجم نص الواجهة"
              min={1}
              max={1.5}
              step={0.25}
              value={uiScale}
              onChange={v => void setUiScale(v)}
            />
            <AppText style={{textAlign: 'center'}}>سبحان الله وبحمده</AppText>
          </Card>
          <Banner
            text="الأرقام 0123456789 · يمكنك إعادة العدادات وقتما شئت"
            icon="reset"
          />
        </>
      )}
      <View style={{flex: 1, minHeight: 8}} />
      <View style={{...rtlRow, justifyContent: 'center', gap: 8}}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: i === step ? p.actionPrimary : p.borderSubtle,
            }}
          />
        ))}
      </View>
      <View style={{...rtlRow, alignItems: 'stretch'}}>
        <View style={{flex: 1}}>
          <Button
            label={step === 4 ? 'ابدأ الآن' : 'التالي'}
            onPress={() => (step === 4 ? onFinish() : setStep(step + 1))}
          />
        </View>
        {step > 0 && (
          <View style={{flex: 1}}>
            <Button secondary label="رجوع" onPress={() => setStep(step - 1)} />
          </View>
        )}
      </View>
    </Page>
  );
}
export function Guidance({onFinish}: {onFinish: () => void}) {
  const p = usePalette();
  return (
    <Page title="ضوابط الرقية الشرعية" contentStyle={{flexGrow: 1}}>
      <Illustration name="quran-book" height={110} />
      {[
        ['التوكل على الله', 'الشفاء من الله، والرقية سبب.', 'hands'],
        ['الدعاء لله وحده', 'بأسمائه الحسنى وكلامه.', 'bell'],
        ['الطمأنينة والتدبر', 'اقرأ بهدوء وتدبر معاني ما تقرأ.', 'book'],
      ].map(([title, detail, icon]) => (
        <Card key={title}>
          <SettingRow title={title} detail={detail} icon={icon as any} />
        </Card>
      ))}
      <Card>
        <AppText role="caption" selectable style={{color: p.textSecondary}}>
          {noteData.content}
        </AppText>
      </Card>
      <View style={{flex: 1}} />
      <Button label="فهمت، متابعة" onPress={onFinish} />
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
  const p = usePalette();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
      <AppIcon name="medallion" size={72} color={p.accent} />
      <AppText style={{fontSize: 36, lineHeight: 54}}>الرقية</AppText>
      <AppText style={{letterSpacing: 6, writingDirection: 'ltr'}}>
        ROQIA
      </AppText>
      <AppText role="caption" style={{color: p.textSecondary}}>
        رفيقك للذكر والقرآن
      </AppText>
      <View style={{position: 'absolute', bottom: 30}}>
        <AppText role="caption">مجاني · بلا إعلانات</AppText>
      </View>
    </View>
  );
}
