import React, {useState, useContext} from 'react';
import {
  FlatList,
  ImageBackground,
  StyleSheet,
} from 'react-native';

import {Header, Section, Note} from '../components';
import {data} from '../data';
import {getRepeatItemKey, repeatContext, themeContext, themes} from '../store';

export const HomeScreen = () => {
  const [showNote, setShowNote] = useState<boolean>(false);
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts} = useContext(repeatContext);
  const theme = themes[mode];
  const icon = mode === 'light' ? 'nightlight-round' : 'sunny';
  const modeText = mode === 'light' ? 'وضع ليلي' : 'وضع نهاري';

  const toggleNote = () => setShowNote(!showNote);

  return (
    <>
      {showNote && <Note />}
      <ImageBackground
        source={require('../assets/images/asfalt-dark.png')}
        style={[styles.background, {backgroundColor: theme.bg}]}
        imageStyle={styles.cover}>
        <FlatList
          data={data}
          keyExtractor={(item, index) => getRepeatItemKey(item.content, index)}
          renderItem={({item, index}) => {
            const itemKey = getRepeatItemKey(item.content, index);

            return (
              <Section
                {...item}
                count={repeatCounts[itemKey] ?? item.repeat ?? 0}
                onPress={() => decrementRepeat(itemKey)}
              />
            );
          }}
          ListHeaderComponent={
            <Header icon={icon} modeText={modeText} />
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
