import React, {useContext} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import InAppBrowser from 'react-native-inappbrowser-reborn';

import {noteData} from '../data';
import {Header, StyledText} from '../components';
import {themeContext, themes} from '../store';

export const AboutScreen = () => {
  const navigation = useNavigation<any>();
  const {mode} = useContext(themeContext);
  const theme = themes[mode];
  const onMenuPress = () => {
    navigation.openDrawer?.();
    navigation.getParent?.()?.openDrawer?.();
    navigation.getParent?.()?.getParent?.()?.openDrawer?.();
  };
  const onBackToHomePress = () => {
    navigation.navigate('MainTabs');
  };

  const onCopy = () => {
    Clipboard.setString(noteData.email!);
  };

  const openLink = async (url: string) => {
    try {
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(url, {
          showTitle: true,
          enableUrlBarHiding: true,
          enableDefaultShare: true,
          dismissButtonStyle: 'close',
        });
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('تعذر فتح الرابط', 'يرجى المحاولة لاحقًا.');
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}> 
      <Header
        onBackPress={onBackToHomePress}
        onMenuPress={onMenuPress}
        showBackButton
        showMenuButton
        title="نبذة عنا"
      />
      <ScrollView
        contentContainerStyle={styles.innerContainer}
        showsVerticalScrollIndicator={false}>
        <StyledText customStyle={[styles.title, {color: theme.tertiaryColor}]}>
          {noteData.title}
        </StyledText>
        <StyledText customStyle={[styles.content, {color: theme.color}]}>
          {noteData.content}
        </StyledText>
        <StyledText customStyle={[styles.contact, {color: theme.color}]}>
          {noteData.contact}
        </StyledText>
        <TouchableOpacity
          accessibilityHint="ينسخ البريد الإلكتروني إلى الحافظة"
          accessibilityLabel="نسخ البريد الإلكتروني"
          accessibilityRole="button"
          onPress={onCopy}
          style={styles.emailButton}>
          <Icon name="content-copy" color={theme.tertiaryColor} size={16} />
          <StyledText customStyle={[styles.email, {color: theme.color}]}> 
            {noteData.email}
          </StyledText>
        </TouchableOpacity>

        <View style={styles.linksContainer}>
          <StyledText customStyle={[styles.sectionTitle, {color: theme.tertiaryColor}]}> 
            الروابط القانونية
          </StyledText>

          <TouchableOpacity
            accessibilityHint="يفتح صفحة سياسة الخصوصية داخل المتصفح"
            accessibilityLabel="سياسة الخصوصية"
            accessibilityRole="button"
            onPress={() => openLink(noteData.policyUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              سياسة الخصوصية / Privacy Policy
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="يفتح صفحة شروط الاستخدام داخل المتصفح"
            accessibilityLabel="شروط الاستخدام"
            accessibilityRole="button"
            onPress={() => openLink(noteData.termsUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              شروط الاستخدام / Terms of Use
            </StyledText>
          </TouchableOpacity>

          <StyledText customStyle={[styles.sectionTitle, {color: theme.tertiaryColor}]}> 
            المصادر والمشروع
          </StyledText>

          <TouchableOpacity
            accessibilityHint="يفتح مستودع المشروع على GitHub"
            accessibilityLabel="مستودع المشروع"
            accessibilityRole="button"
            onPress={() => openLink(noteData.githubRepoUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              GitHub Repository
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="يفتح حساب المطور على GitHub"
            accessibilityLabel="حساب المطور"
            accessibilityRole="button"
            onPress={() => openLink(noteData.authorGithubUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              Author: Mourad Bougarne
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="يفتح المصدر الصوتي الأول داخل المتصفح"
            accessibilityLabel="المصدر الصوتي الأول"
            accessibilityRole="button"
            onPress={() => openLink(noteData.audioSourceOneUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              Audio Source: alazkar.today
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint="يفتح المصدر الصوتي الثاني داخل المتصفح"
            accessibilityLabel="المصدر الصوتي الثاني"
            accessibilityRole="button"
            onPress={() => openLink(noteData.audioSourceTwoUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              Audio Source: mp3quran.net
            </StyledText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 50,
  },
  innerContainer: {
    paddingHorizontal: 40,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 15,
  },
  contact: {
    textAlign: 'right',
    marginTop: 15,
    fontSize: 14,
  },
  email: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  emailButton: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  linksContainer: {
    marginTop: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 14,
    textAlign: 'right',
  },
});
