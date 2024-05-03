import React, {FC} from 'react';
import {StyleProp, StyleSheet, Text, TextProps, TextStyle} from 'react-native';

type StyledProps = TextProps & {
  customStyle: StyleProp<TextStyle>;
};

export const StyledText: FC<StyledProps> = ({children, customStyle}) => {
  return <Text style={[style.text, customStyle]}>{children}</Text>;
};

const style = StyleSheet.create({
  text: {
    fontFamily: 'NotoSansArabic',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    color: '#17202A',
  },
});
