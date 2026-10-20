require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');

const platform = {OS: 'ios'};
let permission = 'granted',
  permissionCalls = 0,
  locationCalls = 0;
const fix = {latitude: 33.57, longitude: -7.59, accuracy: 50, acquiredAt: 1000};
const load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-native')
    return {
      Platform: platform,
      NativeModules: {
        RoqiaPrayer: {
          locate: async () => {
            locationCalls++;
            return fix;
          },
        },
      },
      PermissionsAndroid: {
        PERMISSIONS: {
          ACCESS_FINE_LOCATION: 'fine',
          ACCESS_COARSE_LOCATION: 'coarse',
        },
        RESULTS: {GRANTED: 'granted'},
        requestMultiple: async () => {
          permissionCalls++;
          return {fine: permission, coarse: permission};
        },
      },
    };
  return load.call(this, name, parent, isMain);
};
const {locate} = require('../../src/features/prayer/native.ts');

test('iOS delegates location permission to Core Location without calling Android APIs', async () => {
  assert.deepEqual(await locate(), fix);
  assert.equal(permissionCalls, 0);
  assert.equal(locationCalls, 1);
});

test('Android still requires permission before accessing location', async () => {
  platform.OS = 'android';
  permission = 'denied';
  await assert.rejects(locate(), /location_denied/);
  assert.equal(locationCalls, 1);
  permission = 'granted';
  assert.deepEqual(await locate(), fix);
  assert.equal(permissionCalls, 2);
  assert.equal(locationCalls, 2);
});
