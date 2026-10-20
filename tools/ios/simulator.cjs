const {spawnSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: yarn ios:simulator --udid <iPhone simulator UUID>');
  console.log(
    'Builds and launches Release in place, preserving app data. Metro is not required.',
  );
  process.exit(0);
}
if (
  args.length !== 2 ||
  args[0] !== '--udid' ||
  !/^[A-F0-9-]{36}$/i.test(args[1])
) {
  throw Error(
    'Pass the specific simulator UUID: yarn ios:simulator --udid <UUID>',
  );
}
const udid = args[1];
const env = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`,
};

function run(command, parameters, capture = false) {
  const result = spawnSync(command, parameters, {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout?.trim();
}
const inventory = JSON.parse(
  run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], true),
);
const device = Object.values(inventory.devices)
  .flat()
  .find(d => d.udid === udid);
if (!device || !device.deviceTypeIdentifier.includes('iPhone')) {
  throw Error(
    'The UUID must identify an available iPhone simulator. Physical devices are not supported by this command.',
  );
}
const lockfile = path.join(root, 'ios/Podfile.lock');
const installed = path.join(root, 'ios/Pods/Manifest.lock');
if (
  !fs.existsSync(lockfile) ||
  !fs.existsSync(installed) ||
  !fs.readFileSync(lockfile).equals(fs.readFileSync(installed))
) {
  throw Error('Install the iOS dependencies first: cd ios && pod install');
}
if (device.state !== 'Booted') run('xcrun', ['simctl', 'boot', udid]);
run('xcrun', ['simctl', 'bootstatus', udid, '-b']);
const developer = run('xcode-select', ['-p'], true);
const simulatorApp = [
  path.join(developer, 'Applications/Simulator.app'),
  path.resolve(developer, '../Applications/DeviceHub.app'),
].find(candidate => fs.existsSync(candidate));
if (simulatorApp) run('open', [simulatorApp]);
const checkoutId = createHash('sha256').update(root).digest('hex').slice(0, 12);
const derivedData =
  process.env.ROQIA_IOS_DERIVED_DATA ??
  path.join(os.tmpdir(), `roqia-ios-${checkoutId}`);
run('xcodebuild', [
  '-workspace',
  'ios/app.xcworkspace',
  '-scheme',
  'app',
  '-configuration',
  'Release',
  '-destination',
  `platform=iOS Simulator,id=${udid}`,
  '-derivedDataPath',
  derivedData,
  'CODE_SIGNING_ALLOWED=YES',
  'CODE_SIGN_IDENTITY=-',
  `ARCHS=${os.arch() === 'arm64' ? 'arm64' : 'x86_64'}`,
  'ONLY_ACTIVE_ARCH=YES',
  'build',
]);
const app = path.join(
  derivedData,
  'Build/Products/Release-iphonesimulator/app.app',
);
run('xcrun', ['simctl', 'install', udid, app]);
// Stop only this app on this simulator before launching its freshly installed build.
const stopping = spawnSync(
  'xcrun',
  ['simctl', 'terminate', udid, 'name.roqia.app'],
  {cwd: root, env, encoding: 'utf8'},
);
if (
  stopping.status !== 0 &&
  !/not running|found nothing to terminate/i.test(stopping.stderr ?? '')
) {
  throw Error(stopping.stderr || 'Could not stop the previous simulator app');
}
run('xcrun', ['simctl', 'launch', udid, 'name.roqia.app']);
console.log(`Roqia Release launched on ${device.name} (${udid}).`);
