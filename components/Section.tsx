/* eslint-disable prettier/prettier */
import React, {FC} from 'react';
import {View, Text, StyleSheet} from 'react-native';

type SectionProp = {
  content?: string,
  caption?: string
}

export const Section: FC<SectionProp> = ({caption, content}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    textAlign: 'right',
  },
  content: {
    fontSize: 22,
    fontWeight: '600',
    color: '#17202A',
  },
  caption: {
    fontSize: 16,
    fontWeight: '300',
    color: '#34495E',
  },
});
