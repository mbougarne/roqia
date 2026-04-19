import React, {useContext} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {noteData} from '../data';
import {themeContext, themes} from '../store';
import {StyledText} from './StyledText';

type IntroNoteModalProps = {
  visible: boolean;
  onClose: () => void;
};

export const IntroNoteModal = ({visible, onClose}: IntroNoteModalProps) => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: theme.secondaryBg}]}> 
          <View style={styles.headerRow}>
            <Pressable
              accessibilityHint="يغلق نافذة التنبيه"
              accessibilityLabel="إغلاق التنبيه"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}>
              <Icon color={theme.tertiaryColor} name="close" size={24} />
            </Pressable>
          </View>

          <StyledText customStyle={[styles.title, {color: theme.tertiaryColor}]}> 
            {noteData.title}
          </StyledText>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <StyledText customStyle={[styles.body, {color: theme.color}]}> 
              {noteData.content}
            </StyledText>
          </ScrollView>

          <Pressable
            accessibilityHint="يغلق نافذة التنبيه"
            accessibilityLabel="إغلاق التنبيه"
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.primaryButton, {backgroundColor: theme.tertiaryColor}]}> 
            <StyledText customStyle={[styles.primaryButtonText, {color: theme.secondaryColor}]}> 
              إغلاق
            </StyledText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: '94%',
    maxWidth: 440,
    minHeight: 520,
    maxHeight: '88%',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'right',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  body: {
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 29,
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '900',
    fontSize: 14,
  },
});
