import React, {useState, useEffect, useContext} from 'react';
import {
  FlatList,
  ImageBackground,
  StyleSheet,
} from 'react-native';

import {Header, Section, Note} from '../components';
import {data} from '../data';
import {themeContext, themes} from '../store';

const getID = () => {
  const timeStamp = Date.now().toString();
  const randomNumber = Math.random().toString().split('.')[1];

  return `${timeStamp}-${randomNumber}`;
};

export const HomeScreen = () => {
  const [content, setContent] = useState([{}]);
  const [icon, setIcon] = useState<string>('sunny');
  const [modeText, setModeText] = useState<string>('وضع نهاري');
  const [showNote, setShowNote] = useState<boolean>(false);
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  const toggleNote = () => setShowNote(!showNote);

  useEffect(() => {
    setContent(data);
  }, []);

  useEffect(() => {
    if (mode === 'light') {
      setIcon('nightlight-round');
      setModeText('وضع ليلي');
    } else {
      setIcon('sunny');
      setModeText('وضع نهاري');
    }
  }, [mode]);

  return (
    <>
      {showNote && <Note />}
      <ImageBackground
        source={require('../assets/images/asfalt-dark.png')}
        style={[styles.background, {backgroundColor: theme.bg}]}
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
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingBottom: 20,
  },
  cover: {
    resizeMode: 'repeat',
  },
});
