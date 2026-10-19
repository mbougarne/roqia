#!/usr/bin/env python3
"""Compile a test-only snapshot jar, never included in the app APK."""

import os
import subprocess
import tempfile
from pathlib import Path

sdk = Path(os.environ.get('ANDROID_HOME', str(Path.home() / 'Library/Android/sdk')))
java = (
    Path(
        os.environ.get(
            'JAVA_HOME', str(Path.home() / '.sdkman/candidates/java/current')
        )
    )
    / 'bin'
)
root = Path(__file__).resolve().parent
out = Path('/private/tmp/roqia-phase6')
out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    classes = tmp / 'classes'
    dex = tmp / 'dex'
    classes.mkdir()
    dex.mkdir()
    platform = sdk / 'platforms/android-36'
    classpath = ':'.join(
        str(platform / p)
        for p in ['android.jar', 'uiautomator.jar', 'optional/android.test.base.jar']
    )
    subprocess.run(
        [
            str(java / 'javac'),
            '-source',
            '8',
            '-target',
            '8',
            '-cp',
            classpath,
            '-d',
            str(classes),
            str(root / 'Hierarchy.java'),
            str(
                root.parent.parent
                / 'android/app/src/main/java/name/roqia/app/prayer/HabousTransport.java'
            ),
        ],
        check=True,
    )
    subprocess.run(
        [
            str(sdk / 'build-tools/36.0.0/d8'),
            '--output',
            str(dex),
            *[str(p) for p in classes.rglob('*.class')],
        ],
        check=True,
    )
    subprocess.run(
        [
            str(java / 'jar'),
            'cf',
            str(out / 'hierarchy.jar'),
            '-C',
            str(dex),
            'classes.dex',
        ],
        check=True,
    )
print(out / 'hierarchy.jar')
