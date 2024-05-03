import React, {useState, useEffect} from 'react';
import {
  FlatList,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

import {Header, Section} from './components';
import {data} from './data';
import {type Mode, themeContext, themes} from './store';

const {Provider} = themeContext;

const getID = () => {
  const timeStamp = Date.now().toString();
  const randomNumber = Math.random().toString().split('.')[1];

  return `${timeStamp}-${randomNumber}`;
};

export default function App(): JSX.Element {
  const [content, setContent] = useState([{}]);
  const [mode, setMode] = useState<Mode>('light');
  const [icon, setIcon] = useState<string>('sunny');
  const [modeText, setModeText] = useState<string>('وضع نهاري');

  const toggleMode = () => {
    setIcon(icon === 'sunny' ? 'nightlight-round' : 'sunny');
    setModeText(modeText === 'وضع ليلي' ? 'وضع نهاري' : 'وضع ليلي');
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    setContent(data);
  }, []);

  const style = styles(themes[mode].bg);

  return (
    <Provider value={{mode, toggleMode}}>
      <SafeAreaView>
        <ImageBackground
          source={require('./assets/images/asfalt-dark.png')}
          style={style.background}
          imageStyle={style.cover}>
          <FlatList
            data={content}
            renderItem={({item}) => <Section {...item} />}
            key={getID()}
            ListHeaderComponent={<Header icon={icon} modeText={modeText} />}
          />
        </ImageBackground>
      </SafeAreaView>
    </Provider>
  );
}

const styles = (bg: string) =>
  StyleSheet.create({
    background: {
      paddingBottom: 20,
      backgroundColor: bg,
    },
    cover: {
      resizeMode: 'repeat',
    },
  });
