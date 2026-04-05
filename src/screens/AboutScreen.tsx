import React, {useContext} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
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

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}> 
      <Header title="نبذة عنا" />
      <View style={styles.innerContainer}>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 40,
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
});
