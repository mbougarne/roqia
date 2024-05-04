import React, {type FC, useContext, useState} from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';

import {type DataProps} from '../data';
import {type ContextState, themeContext, themes} from '../store';
import {StyledText} from './StyledText';

type SectionProp = DataProps;

export const Section: FC<SectionProp> = item => {
  const [count, setCount] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);
  const {mode} = useContext<ContextState>(themeContext);

  const theme = themes[mode];
  const onPress = () => {
    if (count === item.repeat) {
      setIsDone(true);
      return;
    }

    setCount(() => count + 1);
  };

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={require('../assets/images/arabesque.png')}
        style={[
          styles.backgroundContainer,
          {backgroundColor: isDone ? theme.activeBg : theme.bg},
        ]}
        imageStyle={styles.backgroundStyle}>
        <TouchableOpacity onPress={onPress}>
          <View style={styles.container}>
            <StyledText
              customStyle={[
                styles.content,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.content}
            </StyledText>
            <StyledText
              customStyle={[
                styles.caption,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.caption}
            </StyledText>
            <StyledText
              customStyle={[
                styles.repeat,
                {color: isDone ? theme.secondaryColor : theme.color},
              ]}>
              {item.repeatDescription}
            </StyledText>
          </View>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
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
  },
  caption: {
    marginVertical: 5,
    fontWeight: '200',
  },
  repeat: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
});
