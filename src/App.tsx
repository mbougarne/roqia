import React, {useState, useEffect} from 'react';
import {
  FlatList,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

import {Header, Note, Section} from './components';
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
  const [showNote, setShowNote] = useState<boolean>(false);

  const toggleMode = () => {
    setIcon(icon === 'sunny' ? 'nightlight-round' : 'sunny');
    setModeText(modeText === 'وضع ليلي' ? 'وضع نهاري' : 'وضع ليلي');
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const toggleNote = () => setShowNote(!showNote);

  useEffect(() => {
    setContent(data);
  }, []);

  return (
    <Provider value={{mode, toggleMode}}>
      <SafeAreaView>
        {showNote && <Note />}
        <ImageBackground
          source={require('./assets/images/asfalt-dark.png')}
          style={[styles.background, {backgroundColor: themes[mode].bg}]}
          imageStyle={styles.cover}>
          <FlatList
            data={content}
            renderItem={({item}) => <Section {...item} />}
            key={getID()}
            ListHeaderComponent={
              <Header toggleNote={toggleNote} icon={icon} modeText={modeText} />
            }
          />
        </ImageBackground>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  background: {
    paddingBottom: 20,
  },
  cover: {
    resizeMode: 'repeat',
  },
});
