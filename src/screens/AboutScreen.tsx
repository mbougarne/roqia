import React, {useContext} from 'react';
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

import {noteData} from '../data';
import {Header, StyledText} from '../components';
import {themeContext, themes} from '../store';

export const AboutScreen = () => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  const onCopy = () => {
    Clipboard.setString(noteData.email!);
  };

  const openLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert('تعذر فتح الرابط', 'يرجى المحاولة لاحقًا.');
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('تعذر فتح الرابط', 'يرجى المحاولة لاحقًا.');
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}> 
      <Header title="نبذة عنا" />
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
        <TouchableOpacity onPress={onCopy} style={styles.emailButton}>
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
            onPress={() => openLink(noteData.policyUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              سياسة الخصوصية / Privacy Policy
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
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
            onPress={() => openLink(noteData.githubRepoUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              GitHub Repository
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLink(noteData.authorGithubUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              Author: Mourad Bougarne
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLink(noteData.audioSourceOneUrl)}
            style={styles.linkButton}>
            <Icon name="open-in-new" color={theme.tertiaryColor} size={16} />
            <StyledText customStyle={[styles.linkText, {color: theme.color}]}> 
              Audio Source: alazkar.today
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
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
