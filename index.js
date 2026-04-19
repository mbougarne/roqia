/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import notifee from '@notifee/react-native';
import App from './src';
import {name as appName} from './app.json';
import {onBackgroundNotificationPress} from './src/services/notifications';

notifee.onBackgroundEvent(onBackgroundNotificationPress);

AppRegistry.registerComponent(appName, () => App);
