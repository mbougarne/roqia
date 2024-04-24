import React, {useState, useEffect} from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {Header, Section} from './components';
import {data, DataProps} from './data';

const getID = () => {
  const timeStamp = Date.now().toString();
  const randomNumber = Math.random().toString().split('.')[1];

  return `${timeStamp}-${randomNumber}`;
};

export default function App(): JSX.Element {
  const [content, setContent] = useState([{}]);

  useEffect(() => {
    setContent(data);
  }, []);

  return (
    <SafeAreaView>
      <ImageBackground
        source={require('./assets/images/asfalt-dark.png')}
        style={styles.background}
        imageStyle={styles.cover}>
        <ScrollView>
          <Header />
          <View style={styles.container}>
            {content.length &&
              content.map((item: DataProps) => (
                <Section key={getID()} {...item} />
              ))}
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  background: {
    paddingBottom: 20,
  },
  cover: {
    resizeMode: 'repeat',
  },
});
