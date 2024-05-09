import React, {FC, useContext} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';

import {noteData} from '../data';
import {StyledText} from './StyledText';
import {themeContext, themes} from '../store';

export const Note: FC = () => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  const onCopy = () => {
    Clipboard.setString(noteData.email!);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.innerContainer, {backgroundColor: theme.bg}]}>
        <StyledText customStyle={[styles.title, {color: theme.tertiaryColor}]}>
          {noteData.title}
        </StyledText>
        <StyledText customStyle={[styles.content, {color: theme.color}]}>
          {noteData.content}
        </StyledText>
        <StyledText customStyle={[styles.contact, {color: theme.color}]}>
          {noteData.contact}
        </StyledText>
        <TouchableOpacity onPress={onCopy}>
          <StyledText customStyle={[styles.content, {color: theme.color}]}>
            <Icon name="content-copy" color={theme.tertiaryColor} size={16} />
            {noteData.email}
          </StyledText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    paddingTop: 75,
    paddingBottom: 100,
    paddingHorizontal: 25,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,.85)',
    zIndex: 2,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 15,
    maxHeight: 500,
  },
  title: {
    marginTop: 25,
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  contact: {
    textAlign: 'right',
  },
});
