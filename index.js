/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry, Platform} from 'react-native';
import notifee from '@notifee/react-native';
import TrackPlayer from 'react-native-track-player';
import App from './src';
import {name as appName} from './app.json';
import {onBackgroundNotificationPress} from './src/services/notifications';

notifee.onBackgroundEvent(onBackgroundNotificationPress);
TrackPlayer.registerPlaybackService(() => require('./src/services/audioPlaybackService'));

AppRegistry.registerComponent(appName, () => App);

// Opt-in Android debug activity; the production component remains unchanged.
if (__DEV__ && Platform.OS === 'android') {
  AppRegistry.registerComponent('RoqiaFeasibility', () => require('./tools/feasibility/ProbeApp').default);
}
