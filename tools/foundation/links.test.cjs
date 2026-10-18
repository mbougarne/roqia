require('./register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
let link, notification, initial;
Module._load = function (id, ...args) {
  if (id === 'react-native')
    return {
      Linking: {
        addEventListener: (_, listener) => {
          link = listener;
        },
        getInitialURL: () =>
          new Promise(resolve => {
            initial = resolve;
          }),
      },
    };
  if (id === '../services/notifications')
    return {
      subscribeToNotificationDeepLinks: listener => {
        notification = listener;
      },
      getInitialNotificationDeepLink: async () => null,
    };
  return originalLoad.call(this, id, ...args);
};
const {
  startLinkCapture,
  consumeLinks,
} = require('../../src/navigation/linkInbox.ts');
Module._load = originalLoad;
test('links survive hydration and overlapping activity mounts without stale cleanup or initial-link replay', async () => {
  startLinkCapture();
  link({url: 'roqia://more'});
  const delivered = [];
  const oldCleanup = consumeLinks(url => {
    delivered.push(url);
    return true;
  });
  assert.deepEqual(delivered, ['roqia://more']);
  initial('roqia://home');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(delivered, ['roqia://more']);
  const newCleanup = consumeLinks(url => {
    delivered.push(url);
    return true;
  });
  oldCleanup();
  notification('roqia://adkar/night');
  notification('roqia://adkar/night');
  assert.deepEqual(delivered, ['roqia://more', 'roqia://adkar/night']);
  newCleanup();
  const notReadyCleanup = consumeLinks(() => false);
  link({url: 'roqia://storage'});
  const finalCleanup = consumeLinks(url => {
    delivered.push(url);
    return true;
  });
  notReadyCleanup();
  link({url: 'roqia://settings'});
  assert.deepEqual(delivered.slice(-2), [
    'roqia://storage',
    'roqia://settings',
  ]);
  finalCleanup();
});
