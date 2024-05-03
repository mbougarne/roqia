import React, {FC, useContext, useState} from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';

import {DataProps} from '../data';
import {ContextState, Themes, themeContext, themes} from '../store';
import {StyledText} from './StyledText';

type SectionProp = DataProps;

export const Section: FC<SectionProp> = item => {
  const [count, setCount] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);
  const {mode} = useContext<ContextState>(themeContext);

  const style = styles(themes[mode], isDone);

  const onPress = () => {
    if (count === item.repeat) {
      setIsDone(true);
      return;
    }

    setCount(() => count + 1);
  };

  return (
    <View style={style.mainContainer}>
      <ImageBackground
        source={require('../assets/images/arabesque.png')}
        style={style.backgroundContainer}
        imageStyle={style.backgroundStyle}>
        <TouchableOpacity onPress={onPress}>
          <View style={style.container}>
            <StyledText customStyle={style.content}>{item.content}</StyledText>
            <StyledText customStyle={style.caption}>{item.caption}</StyledText>
            <StyledText customStyle={style.repeat}>
              {item.repeatDescription}
            </StyledText>
          </View>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
};

const styles = (theme: Themes['dark' | 'light'], isDone: boolean) =>
  StyleSheet.create({
    mainContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    backgroundContainer: {
      marginBottom: 50,
      paddingVertical: 25,
      width: 320,
      minHeight: 175,
      backgroundColor: isDone ? theme.activeBg : theme.bg,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.16,
      shadowRadius: 1.51,
      elevation: 2,
    },
    backgroundStyle: {
      resizeMode: 'repeat',
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignContent: 'center',
      paddingHorizontal: 20,
    },
    content: {
      fontSize: 18,
      color: isDone ? theme.secondaryColor : theme.color,
    },
    caption: {
      marginVertical: 5,
      fontWeight: '200',
      color: isDone ? theme.secondaryColor : theme.color,
    },
    repeat: {
      marginVertical: 5,
      fontSize: 12,
      fontWeight: '700',
      color: isDone ? theme.secondaryColor : theme.color,
    },
  });
