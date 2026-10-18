import React, {type FC} from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';

type StyledProps = TextProps & {
  customStyle?: StyleProp<TextStyle>;
};

export const StyledText: FC<StyledProps> = ({
  children,
  customStyle,
  style: textStyle,
  ...props
}) => {
  const resolved = StyleSheet.flatten([style.text, customStyle, textStyle]);
  const value =
    resolved.fontWeight === 'bold' ? 700 : Number(resolved.fontWeight) || 400;
  const weight =
    value >= 700 ? 700 : value >= 600 ? 600 : value >= 500 ? 500 : 400;
  return (
    <Text
      {...props}
      allowFontScaling
      style={[
        resolved,
        {fontFamily: `RoqiaArabic${weight}`, fontWeight: 'normal'},
      ]}>
      {children}
    </Text>
  );
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
