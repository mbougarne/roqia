/**
 * @format
 */

import 'react-native-gesture-handler';
import notifee from '@notifee/react-native';
import {AppRegistry, Platform} from 'react-native';
import TrackPlayer from 'react-native-track-player';

import {name as appName} from './app.json';
import App from './src';
import {startLinkCapture} from './src/navigation/linkInbox';
import {onBackgroundNotificationPress} from './src/services/notifications';

startLinkCapture();
notifee.onBackgroundEvent(onBackgroundNotificationPress);
TrackPlayer.registerPlaybackService(
  () => require('./src/services/audioPlaybackService').default,
);

AppRegistry.registerHeadlessTask(
  'RoqiaPrayerRenewal',
  () => require('./src/features/prayer/renewal').default,
);
AppRegistry.registerComponent(appName, () => App);

// Opt-in Android debug activity; the production component remains unchanged.
if (__DEV__ && Platform.OS === 'android') {
  AppRegistry.registerComponent(
    'RoqiaFeasibility',
    () => require('./tools/feasibility/ProbeApp').default,
  );
}
