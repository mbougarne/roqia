import React, {useContext, useEffect, useState} from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {type RouteProp, useIsFocused} from '@react-navigation/native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {audioAssets} from '../assets/audio';
import {adkarData} from '../data';
import {Header, Section, StyledText} from '../components';
import {getRepeatItemKey, repeatContext, themeContext, themes} from '../store';

type AdkarStackParamList = {
  AdkarHome: undefined;
  Morning: undefined;
  Night: undefined;
  BeforeSleep: undefined;
};

type AdkarCategoryRouteName = Exclude<keyof AdkarStackParamList, 'AdkarHome'>;
type AdkarCategoryScreenProps = {
  navigation: NativeStackNavigationProp<AdkarStackParamList, AdkarCategoryRouteName>;
  route: RouteProp<AdkarStackParamList, AdkarCategoryRouteName>;
};
type AdkarMenuScreenProps = {
  navigation: NativeStackNavigationProp<AdkarStackParamList, 'AdkarHome'>;
};
const Stack = createNativeStackNavigator<AdkarStackParamList>();

const categoryConfig: Record<AdkarCategoryRouteName, {icon: string; title: string}> = {
  Morning: {
    icon: 'wb-sunny',
    title: 'أذكار الصباح',
  },
  Night: {
    icon: 'dark-mode',
    title: 'أذكار المساء',
  },
  BeforeSleep: {
    icon: 'hotel',
    title: 'أذكار قبل النوم',
  },
};

const AdkarMenuScreen = ({navigation}: AdkarMenuScreenProps) => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}> 
      <Header title="أذكار اليوم" />
      <View style={styles.menuContainer}>
        {(Object.keys(categoryConfig) as AdkarCategoryRouteName[]).map(routeName => {
          const config = categoryConfig[routeName];

          return (
            <Pressable
              key={routeName}
              onPress={() => navigation.navigate(routeName)}
              style={styles.menuButtonWrapper}>
              <ImageBackground
                source={require('../assets/images/arabesque.png')}
                style={[styles.menuButton, {backgroundColor: theme.secondaryBg}]}
                imageStyle={styles.menuButtonBackground}>
                <Icon color={theme.tertiaryColor} name={config.icon} size={34} />
                <StyledText
                  customStyle={[styles.menuButtonText, {color: theme.tertiaryColor}]}> 
                  {config.title}
                </StyledText>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const AdkarCategoryScreen = ({navigation, route}: AdkarCategoryScreenProps) => {
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const isFocused = useIsFocused();
  const {mode} = useContext(themeContext);
  const {decrementRepeat, repeatCounts} = useContext(repeatContext);
  const theme = themes[mode];
  const filteredData = adkarData.filter(item => item.category === route.name);

  const onAudioPress = (audioFile: string) => {
    if (activeAudioFile === audioFile) {
      setIsAudioPaused(currentValue => !currentValue);
      return;
    }

    setActiveAudioFile(audioFile);
    setIsAudioPaused(false);
  };

  const onAudioFinished = () => {
    setActiveAudioFile(null);
    setIsAudioPaused(false);
  };

  useEffect(() => {
    if (!isFocused) {
      onAudioFinished();
    }
  }, [isFocused]);

  const activeAudioSource = activeAudioFile ? audioAssets[activeAudioFile] : null;
  const resolvedActiveAudioUri = activeAudioSource
    ? Image.resolveAssetSource(activeAudioSource).uri
    : undefined;

  return (
    <ImageBackground
      source={require('../assets/images/asfalt-dark.png')}
      style={[styles.container, {backgroundColor: theme.bg}]}
      imageStyle={styles.cover}>
      <FlatList
        data={filteredData}
        contentContainerStyle={styles.categoryListContent}
        extraData={{activeAudioFile, isAudioPaused, repeatCounts}}
        keyExtractor={(item, index) => getRepeatItemKey(item, index, 'adkar')}
        renderItem={({item, index}) => {
          const itemKey = getRepeatItemKey(item, index, 'adkar');

          return (
            <Section
              {...item}
              activeAudioFile={activeAudioFile}
              count={repeatCounts[itemKey] ?? item.repeat ?? 0}
              isAudioPaused={isAudioPaused}
              onPress={() => decrementRepeat(itemKey)}
              onAudioFilePress={onAudioPress}
            />
          );
        }}
        ListHeaderComponent={
          <Header
            onBackPress={navigation.goBack}
            showBackButton
            title={categoryConfig[route.name].title}
          />
        }
      />
      {resolvedActiveAudioUri ? (
        <Video
          ignoreSilentSwitch="ignore"
          onEnd={onAudioFinished}
          onError={onAudioFinished}
          paused={isAudioPaused}
          playInBackground={false}
          playWhenInactive={false}
          source={{uri: resolvedActiveAudioUri}}
          style={styles.hiddenPlayer}
        />
      ) : null}
    </ImageBackground>
  );
};

export const AdkarScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: 'transparent'},
        headerShown: false,
      }}>
      <Stack.Screen component={AdkarMenuScreen} name="AdkarHome" />
      <Stack.Screen component={AdkarCategoryScreen} name="Morning" />
      <Stack.Screen component={AdkarCategoryScreen} name="Night" />
      <Stack.Screen component={AdkarCategoryScreen} name="BeforeSleep" />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cover: {
    resizeMode: 'repeat',
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 90,
  },
  menuButtonWrapper: {
    marginBottom: 24,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 18,
    minHeight: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  menuButtonBackground: {
    resizeMode: 'repeat',
  },
  menuButtonText: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  categoryListContent: {
    paddingBottom: 50,
  },
  hiddenPlayer: {
    width: 0,
    height: 0,
  },
});
