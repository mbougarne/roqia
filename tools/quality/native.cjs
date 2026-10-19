const {spawnSync} = require('node:child_process');
const path = require('node:path');

const mode = process.argv[2];
const family = process.argv[3] ?? 'all';
if (
  !['check', 'apply'].includes(mode) ||
  !['all', 'jvm', 'objc', 'swift'].includes(family)
) {
  throw new Error(
    'Usage: node tools/quality/native.cjs <check|apply> [jvm|objc|swift]',
  );
}
const root = path.resolve(__dirname, '../..');
const apply = mode === 'apply';

function run(command, args) {
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function files(extensions) {
  const result = spawnSync(
    'git',
    ['ls-files', '-co', '--exclude-standard', '-z', 'ios', 'tools'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return [...new Set(result.stdout.split('\0'))].filter(file =>
    extensions.includes(path.extname(file)),
  );
}

if (family === 'all' || family === 'jvm') {
  run(
    process.platform === 'win32' ? 'android/gradlew.bat' : './android/gradlew',
    ['-p', '.', '--console=plain', apply ? 'spotlessApply' : 'spotlessCheck'],
  );
}
if (family === 'all' || family === 'objc') {
  const targets = files(['.h', '.m', '.mm']);
  if (targets.length)
    run(
      path.join(
        root,
        '.venv-quality',
        process.platform === 'win32'
          ? 'Scripts/clang-format.exe'
          : 'bin/clang-format',
      ),
      [...(apply ? ['-i'] : ['--dry-run', '--Werror']), ...targets],
    );
}
if (family === 'all' || family === 'swift') {
  const targets = files(['.swift']);
  if (targets.length)
    run('swift', [
      'format',
      apply ? 'format' : 'lint',
      ...(apply ? ['--in-place'] : ['--strict']),
      ...targets,
    ]);
}
