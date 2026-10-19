import React, {useContext, useEffect, useState} from 'react';
import {
  Pressable,
  View,
  useWindowDimensions,
  type ViewProps,
} from 'react-native';
import TrackPlayer, {
  useActiveTrack,
  useProgress,
} from 'react-native-track-player';

import {data, noteData} from '../data';
import {
  Banner,
  Disclosure,
  Ornament,
  Progress,
  Range,
  rtlRow,
} from '../design/components';
import {Illustration} from '../design/Illustration';
import {LaunchOrnaments} from '../design/LaunchOrnaments';
import {
  AppIcon,
  AppText,
  Button,
  Card,
  IconButton,
  Page,
  usePalette,
  type IconName,
} from '../design/ui';
import {useFormat} from '../design/useFormat';
import {Waveform} from '../design/Waveform';
import {playback} from '../features/audio/controller';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
import {themeContext} from '../store';

const slides = [
  ['مرحبا بك في الرقية', 'الرقية والأذكار والقرآن في مكان واحد'],
  ['اقرأ واستمع', 'استمع للنص وأكمل من حيث توقفت'],
  ['كل ما تحتاجه قريب', 'الأدعية والتسبيحات والإعدادات في المزيد'],
  ['أذكارك على مهل', 'اضغط بعد القراءة لتتبع التكرار'],
  ['اجعله مناسبا لك', 'يمكنك تعديل اختياراتك لاحقا'],
];

function GuideCard({style, ...props}: ViewProps) {
  const dark = useContext(themeContext).mode === 'dark';
  return (
    <Card
      {...props}
      style={[
        {
          backgroundColor: dark ? '#0A3026' : '#FFFFFF',
          borderColor: dark ? '#315243' : '#E9E7E0',
        },
        style,
      ]}
    />
  );
}

function RoundIcon({name, size = 28}: {name: IconName; size?: number}) {
  const p = usePalette();
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: p.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <AppIcon name={name} size={size} color={p.accent} strokeWidth={1.2} />
    </View>
  );
}

function AudioPreview() {
  const audio = useScreenAudioPlayback(data.slice(0, 1), 'guide-preview');
  const track = useActiveTrack(),
    {position, duration} = useProgress();
  const active = track?.scope === 'guide-preview',
    p = usePalette();
  useEffect(
    () => () => {
      void TrackPlayer.getActiveTrack()
        .then(t => {
          if (t?.scope === 'guide-preview') return playback.stop();
        })
        .catch(() => undefined);
    },
    [],
  );
  return (
    <GuideCard style={{gap: 16, paddingVertical: 20}}>
      <View style={rtlRow}>
        <AppIcon name="medallion" color={p.accent} />
        <AppText role="bodyStrong" style={{flex: 1}}>
          الرقية الشرعية
        </AppText>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            active && !audio.isAudioPaused
              ? 'إيقاف مؤقت'
              : 'استماع واحد أو تشغيل القائمة'
          }
          onPress={() => void audio.onPlayAllPress()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: p.actionPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AppIcon
            name={active && !audio.isAudioPaused ? 'pause' : 'play'}
            color={p.textOnAction}
          />
        </Pressable>
        <Waveform color={p.actionPrimary} />
      </View>
      <Progress value={active && duration ? position / duration : 0} />
      <AppText
        role="caption"
        style={{textAlign: 'center', color: p.textSecondary}}>
        يمكنك متابعة القراءة والتصفح مع المشغل المصغر.
      </AppText>
      {audio.error && (
        <AppText accessibilityRole="alert">{audio.error}</AppText>
      )}
    </GuideCard>
  );
}

export function Guide({onFinish}: {onFinish: () => void}) {
  const {number, digits} = useFormat();
  const [step, setStep] = useState(0),
    [sample, setSample] = useState(3);
  const {preference, setPreference, uiScale, setUiScale, mode} =
      useContext(themeContext),
    p = usePalette();
  const {height, width, fontScale} = useWindowDimensions();
  const roomy = height > 780 && fontScale <= 1.2 && uiScale === 1;
  const stacked = width < 360 || fontScale > 1.2 || uiScale > 1;
  const heading = {
    textAlign: 'center' as const,
    fontSize: 24 * uiScale,
    lineHeight: 38 * uiScale,
  };
  return (
    <Page
      title={step === 2 || step === 3 ? `${step + 1} / 5` : ''}
      onBack={() => (step ? setStep(step - 1) : onFinish())}
      actions={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تخطي"
          onPress={onFinish}
          style={{minWidth: 48, minHeight: 48, justifyContent: 'center'}}>
          <AppText style={{color: p.textSecondary}}>تخطي</AppText>
        </Pressable>
      }
      contentStyle={{
        flexGrow: 1,
        gap: step === 4 ? 8 : 16,
        paddingBottom: 16,
      }}>
      {step < 2 ? (
        <View style={{paddingTop: roomy ? 24 : 0}}>
          <Illustration
            name={step === 0 ? 'quran-book' : 'listening'}
            height={roomy ? 220 : 170}
          />
        </View>
      ) : (
        <View
          style={{
            paddingTop: roomy && step !== 4 ? 20 : 0,
            paddingHorizontal: 60,
          }}>
          <Ornament />
        </View>
      )}
      {step === 4 && (
        <AppText
          role="caption"
          style={{textAlign: 'center', color: p.textSecondary}}>
          {number(step + 1)} / {number(5)}
        </AppText>
      )}
      <View style={{gap: 6, marginBottom: step === 2 ? 8 : 0}}>
        <AppText role="screenTitle" style={heading}>
          {slides[step][0]}
        </AppText>
        {step !== 2 && (
          <AppText style={{textAlign: 'center', color: p.textSecondary}}>
            {slides[step][1]}
          </AppText>
        )}
      </View>
      {step === 0 && (
        <View style={{gap: 10}}>
          {(
            [
              ['مجاني بالكامل', 'جميع المحتويات متاحة دون اشتراك', 'gift'],
              ['بدون إعلانات', 'تجربة هادئة ومريحة', 'no-ads'],
              ['اقرأ دون اتصال', 'المحتوى المحفوظ معك في أي وقت', 'download'],
            ] as const
          ).map(([title, detail, icon]) => (
            <GuideCard
              key={title}
              style={{...rtlRow, padding: 12, minHeight: 82}}>
              <RoundIcon name={icon} />
              <View style={{flex: 1}}>
                <AppText role="bodyStrong">{title}</AppText>
                <AppText role="caption" style={{color: p.textSecondary}}>
                  {detail}
                </AppText>
              </View>
            </GuideCard>
          ))}
        </View>
      )}
      {step === 1 && (
        <>
          <AudioPreview />
          <Banner
            icon="download"
            text="حمّل التلاوات التي تختارها للاستماع دون اتصال."
          />
        </>
      )}
      {step === 2 && (
        <>
          <View style={{gap: 10}}>
            {(
              [
                ['الرقية', 'book'],
                ['القرآن', 'book'],
                ['الأذكار', 'tasbih'],
                ['الصلاة', 'mosque'],
                ['المزيد', 'more'],
              ] as const
            ).map(([title, icon]) => (
              <GuideCard
                key={title}
                style={{
                  ...rtlRow,
                  flexDirection: mode === 'dark' ? 'row' : 'row-reverse',
                  minHeight: roomy ? 82 : 72,
                  padding: 12,
                }}>
                <RoundIcon name={icon} size={32} />
                <AppText
                  role="bodyStrong"
                  style={{flex: 1, fontSize: 16 * uiScale}}>
                  {title}
                </AppText>
                <AppIcon
                  name={mode === 'dark' ? 'chevron-right' : 'chevron-left'}
                  size={20}
                />
              </GuideCard>
            ))}
          </View>
          <AppText
            role="caption"
            style={{textAlign: 'center', color: p.textSecondary}}>
            {slides[step][1]}
          </AppText>
        </>
      )}
      {step === 3 && (
        <>
          <GuideCard style={{paddingVertical: roomy ? 28 : 20, gap: 24}}>
            <Ornament />
            <AppText
              role="devotional"
              style={{textAlign: 'center', fontSize: 26, lineHeight: 44}}>
              سبحان الله وبحمده
            </AppText>
            <AppText
              role="counter"
              style={{textAlign: 'center', fontSize: 36, lineHeight: 50}}>
              {number(sample)} / {number(3)}
            </AppText>
            <Button
              icon="check"
              label={sample ? 'تمت القراءة' : 'اكتمل المثال'}
              disabled={!sample}
              onPress={() => setSample(n => Math.max(0, n - 1))}
            />
          </GuideCard>
          <GuideCard style={{padding: 12}}>
            <View style={{...rtlRow, alignItems: 'stretch', gap: 0}}>
              {(
                [
                  ['الصباح', 'sun'],
                  ['المساء', 'sunset'],
                  ['قبل النوم', 'moon'],
                ] as const
              ).map(([title, icon], i) => (
                <View
                  key={title}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 8,
                    borderLeftWidth: i < 2 ? 0.5 : 0,
                    borderColor: p.borderSubtle,
                  }}>
                  <AppIcon name={icon} color={p.accent} size={32} />
                  <AppText role="caption" style={{textAlign: 'center'}}>
                    {title}
                  </AppText>
                </View>
              ))}
            </View>
          </GuideCard>
          <AppText
            role="caption"
            style={{textAlign: 'center', color: p.textSecondary}}>
            يبقى تقدمك محفوظا حتى تعيد العداد
          </AppText>
        </>
      )}
      {step === 4 && (
        <>
          <GuideCard style={{padding: 12, gap: 6}}>
            <Ornament title="المظهر" />
            <View
              accessibilityRole="radiogroup"
              style={{
                ...rtlRow,
                flexDirection: stacked ? 'column' : 'row-reverse',
                alignItems: 'stretch',
                gap: 6,
              }}>
              {(
                [
                  ['light', 'فاتح'],
                  ['dark', 'داكن'],
                  ['system', 'حسب الجهاز'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{checked: preference === value}}
                  onPress={() => setPreference(value)}
                  style={{
                    ...rtlRow,
                    flex: stacked ? undefined : 1,
                    minHeight: 52,
                    padding: 8,
                    borderWidth: 1,
                    borderColor:
                      preference === value ? p.selection : p.borderSubtle,
                    borderRadius: 8,
                    backgroundColor:
                      preference === value ? p.selection : 'transparent',
                    justifyContent: 'space-between',
                    gap: 4,
                  }}>
                  <AppText
                    role="caption"
                    style={{
                      flexShrink: 1,
                      color:
                        preference === value
                          ? p.textOnSelection
                          : p.textPrimary,
                    }}>
                    {label}
                  </AppText>
                  <View
                    style={{
                      width: 21,
                      height: 21,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor:
                        preference === value
                          ? p.textOnSelection
                          : p.borderControl,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {preference === value && (
                      <View
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: 6,
                          backgroundColor: p.textOnSelection,
                        }}
                      />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </GuideCard>
          <GuideCard style={{padding: 12, gap: 6}}>
            <Ornament title="حجم نص الواجهة" />
            <Range
              hideLabel
              label="حجم نص الواجهة"
              min={1}
              max={1.5}
              step={0.25}
              value={uiScale}
              onChange={v => void setUiScale(v)}
            />
            <View
              style={{
                backgroundColor: p.surfaceMuted,
                padding: 12,
                borderRadius: 8,
              }}>
              <AppText style={{textAlign: 'center'}}>سبحان الله وبحمده</AppText>
            </View>
          </GuideCard>
          <GuideCard style={{padding: 12, gap: 6}}>
            <Ornament title="الأرقام" />
            <AppText
              style={{
                writingDirection: 'ltr',
                textAlign: 'left',
                backgroundColor: p.surfaceMuted,
                padding: 10,
                borderRadius: 8,
              }}>
              {digits('0123456789')}
            </AppText>
          </GuideCard>
          <Banner text="يمكنك إعادة العدادات وقتما شئت" icon="reset" />
        </>
      )}
      <View style={{flex: 1, minHeight: 4}} />
      <View
        style={{
          ...rtlRow,
          justifyContent: 'center',
          gap: 9,
          paddingVertical: 4,
        }}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === step ? 9 : 7,
              height: i === step ? 9 : 7,
              borderRadius: 5,
              backgroundColor: i === step ? p.actionPrimary : p.borderSubtle,
            }}
          />
        ))}
      </View>
      <View
        style={{
          ...rtlRow,
          flexDirection:
            step === 4 || (step === 1 && mode === 'light') || stacked
              ? 'column'
              : 'row-reverse',
          alignItems: 'stretch',
        }}>
        <View style={{flex: 1}}>
          <Button
            label={step === 4 ? 'ابدأ الآن' : 'التالي'}
            onPress={() => (step === 4 ? onFinish() : setStep(step + 1))}
          />
        </View>
        {step > 0 && (
          <View style={{alignItems: 'center', justifyContent: 'center'}}>
            <IconButton
              name="chevron-right"
              label="رجوع"
              onPress={() => setStep(step - 1)}
            />
          </View>
        )}
      </View>
    </Page>
  );
}

export function Guidance({onFinish}: {onFinish: () => void}) {
  const p = usePalette(),
    {uiScale} = useContext(themeContext);
  return (
    <Page
      title=""
      onBack={onFinish}
      contentStyle={{flexGrow: 1, gap: 12, paddingBottom: 16}}>
      <View style={{alignItems: 'center', paddingVertical: 20, gap: 20}}>
        <AppIcon name="book" size={68} color={p.accent} strokeWidth={0.65} />
        <AppText
          role="screenTitle"
          style={{
            fontSize: 22 * uiScale,
            lineHeight: 36 * uiScale,
            textAlign: 'center',
          }}>
          ضوابط الرقية الشرعية
        </AppText>
      </View>
      {(
        [
          ['التوكل على الله', 'الشفاء من الله، والرقية سبب.', 'hands'],
          ['الدعاء لله وحده', 'بأسمائه الحسنى وكلامه.', 'mosque'],
          ['الطمأنينة والتدبر', 'اقرأ بهدوء وتدبر معاني ما تقرأ.', 'book'],
        ] as const
      ).map(([title, detail, icon]) => (
        <GuideCard
          key={title}
          style={{minHeight: 132, justifyContent: 'center', gap: 10}}>
          <View style={{alignItems: 'flex-end'}}>
            <AppIcon name="medallion" size={22} color={p.accent} />
          </View>
          <View style={rtlRow}>
            <RoundIcon name={icon} size={30} />
            <View style={{flex: 1, gap: 4}}>
              <AppText role="sectionTitle">{title}</AppText>
              <AppText role="caption" style={{color: p.textSecondary}}>
                {detail}
              </AppText>
            </View>
          </View>
        </GuideCard>
      ))}
      <Disclosure title="ضوابط الرقية الشرعية">
        <AppText role="caption" selectable style={{color: p.textSecondary}}>
          {noteData.content}
        </AppText>
      </Disclosure>
      <View style={{flex: 1, minHeight: 8}} />
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
      <LaunchOrnaments />
      <AppIcon name="medallion" size={72} color={p.accent} />
      <AppText style={{fontSize: 42, lineHeight: 64}}>الرقية</AppText>
      <AppText style={{letterSpacing: 6, writingDirection: 'ltr'}}>
        ROQIA
      </AppText>
      <AppText role="caption" style={{color: p.textSecondary}}>
        رفيقك للذكر والقرآن
      </AppText>
      <View style={{position: 'absolute', bottom: 30}}>
        <AppText role="caption">مجاني · بدون إعلانات</AppText>
      </View>
    </View>
  );
}
