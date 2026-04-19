import React, {useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {StyledText} from './StyledText';
import {themeContext, themes} from '../store';

type WalkthroughModalProps = {
  visible: boolean;
  onFinish: () => void;
};

type WalkthroughStep = {
  title: string;
  description: string;
};

const walkthroughSteps: WalkthroughStep[] = [
  {
    title: 'مرحبًا بك في تطبيق الرقية',
    description:
      'في الشاشة الرئيسية ستجد نصوص الرقية، ويمكنك الضغط على كل بطاقة لتقليل العداد حسب عدد التكرار المطلوب.',
  },
  {
    title: 'زر الصوت داخل كل بطاقة',
    description:
      'اضغط زر الصوت لتشغيل التلاوة الخاصة بالذكر، واضغط مرة أخرى لإيقاف أو متابعة التشغيل.',
  },
  {
    title: 'زر المزيد في الأعلى',
    description:
      'زر المزيد يفتح القائمة الجانبية للوصول السريع إلى الأدعية والتسبيحات وصفحة نبذة.',
  },
  {
    title: 'تبويب أذكار اليوم',
    description:
      'من تبويب أذكار يمكنك الانتقال إلى أذكار الصباح أو المساء أو قبل النوم، مع نفس أسلوب العد والتشغيل.',
  },
  {
    title: 'إعادة العدادات وتبديل الثيم',
    description:
      'من رأس الصفحة يمكنك إعادة عداد الصفحة أو جميع العدادات، وكذلك التبديل بين الوضع النهاري والليلي.',
  },
];

export const WalkthroughModal = ({visible, onFinish}: WalkthroughModalProps) => {
  const {mode} = React.useContext(themeContext);
  const [stepIndex, setStepIndex] = useState(0);
  const theme = themes[mode];
  const isLastStep = stepIndex === walkthroughSteps.length - 1;

  const progressText = useMemo(
    () => `${stepIndex + 1} / ${walkthroughSteps.length}`,
    [stepIndex],
  );

  const onNextPress = () => {
    if (isLastStep) {
      onFinish();
      return;
    }

    setStepIndex(current => current + 1);
  };

  const onSkipPress = () => {
    onFinish();
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: theme.secondaryBg}]}> 
          <StyledText customStyle={[styles.progressText, {color: theme.color}]}> 
            {progressText}
          </StyledText>
          <StyledText customStyle={[styles.title, {color: theme.tertiaryColor}]}> 
            {walkthroughSteps[stepIndex].title}
          </StyledText>
          <StyledText customStyle={[styles.description, {color: theme.color}]}> 
            {walkthroughSteps[stepIndex].description}
          </StyledText>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityLabel="تخطي الدليل"
              accessibilityRole="button"
              onPress={onSkipPress}
              style={[styles.secondaryButton, {borderColor: theme.tertiaryColor}]}> 
              <StyledText customStyle={[styles.secondaryButtonText, {color: theme.tertiaryColor}]}> 
                تخطي
              </StyledText>
            </Pressable>

            <Pressable
              accessibilityLabel={isLastStep ? 'إنهاء الدليل' : 'التالي'}
              accessibilityRole="button"
              onPress={onNextPress}
              style={[styles.primaryButton, {backgroundColor: theme.tertiaryColor}]}> 
              <StyledText customStyle={[styles.primaryButtonText, {color: theme.secondaryColor}]}> 
                {isLastStep ? 'ابدأ الآن' : 'التالي'}
              </StyledText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  progressText: {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.85,
  },
  title: {
    marginTop: 8,
    textAlign: 'right',
    fontSize: 22,
    fontWeight: '900',
  },
  description: {
    marginTop: 14,
    textAlign: 'right',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 20,
    flexDirection: 'row-reverse',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '900',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '900',
    fontSize: 14,
  },
});
