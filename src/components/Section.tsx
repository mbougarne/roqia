import React, {FC, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import {DataProps} from '../data';

type SectionProp = DataProps;

export const Section: FC<SectionProp> = item => {
  const [count, setCount] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);

  const onPress = () => {
    if (count === item.repeat) {
      setIsDone(true);
      return;
    }

    setCount(() => count + 1);
  };

  return (
    <ImageBackground
      source={require('../assets/images/arabesque.png')}
      style={styles(isDone).backgroundContainer}
      imageStyle={styles(isDone).backgroundStyle}>
      <TouchableOpacity onPress={onPress}>
        <View style={styles(isDone).container}>
          <Text style={styles(isDone).content}>{item.content}</Text>
          <Text style={styles(isDone).caption}>{item.caption}</Text>
          <Text style={styles(isDone).repeat}>{item.repeatDescription}</Text>
        </View>
      </TouchableOpacity>
    </ImageBackground>
  );
};

const styles = (isDone: boolean) =>
  StyleSheet.create({
    backgroundContainer: {
      flex: 1,
      marginBottom: 50,
      paddingVertical: 25,
      width: 320,
      minHeight: 175,
      backgroundColor: isDone ? '#1A4D2E' : '#fff',
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
      fontFamily: 'NotoSansArabic',
      fontSize: 18,
      fontWeight: '400',
      color: isDone ? '#F5EFE6' : '#17202A',
      textAlign: 'center',
    },
    caption: {
      marginVertical: 5,
      fontFamily: 'NotoSansArabic',
      fontSize: 14,
      fontWeight: '200',
      color: isDone ? '#E8DFCA' : '#4F6F52',
      textAlign: 'center',
    },
    repeat: {
      marginVertical: 5,
      fontFamily: 'NotoSansArabic',
      fontSize: 12,
      fontWeight: '700',
      color: isDone ? '#E8DFCA' : '#4F6F52',
      textAlign: 'center',
    },
  });
