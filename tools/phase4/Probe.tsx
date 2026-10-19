// Only reachable through the opt-in Android debug activity. Never add fixtures to the release catalog.
import React, {useEffect, useState} from 'react';
import {NativeModules, Text} from 'react-native';
import {FileSystem, Dirs} from 'react-native-file-access';

import App from '../../src/App';
import {DownloadCoordinator} from '../../src/features/downloads/coordinator';
import {nativeDownloadPorts} from '../../src/features/downloads/native';
import {QuranContext} from '../../src/features/quran/context';
import {type QuranCatalog} from '../../src/features/quran/domain';
import {QuranRuntime} from '../../src/features/quran/runtime';

const log = (event: string, detail: object) =>
  NativeModules.RoqiaProbe.record(event, JSON.stringify(detail));

export default function Phase4Probe({scenario}: {scenario: string}) {
  const [runtime, setRuntime] = useState<QuranRuntime | null>(null),
    [status, setStatus] = useState('Loading private phase 4 fixture');
  useEffect(() => {
    void (async () => {
      const cache = `${Dirs.DocumentDir}/phase4-catalog.json`;
      let catalog: QuranCatalog;
      if (await FileSystem.exists(cache))
        catalog = JSON.parse(await FileSystem.readFile(cache, 'utf8'));
      else {
        const response = await fetch('http://127.0.0.1:8083/catalog.json');
        if (!response.ok) throw Error('fixture_catalog_unavailable');
        catalog = await response.json();
        await FileSystem.writeFile(cache, JSON.stringify(catalog), 'utf8');
      }
      const packs = [
        ...catalog.texts.map(t => t.pack),
        ...catalog.translations.map(t => t.pack),
        ...catalog.recordings.flatMap(r => r.chapters.map(c => c.pack)),
      ];
      const downloads = new DownloadCoordinator(
        packs,
        nativeDownloadPorts,
        true,
      );
      const initialize = async () => {
        await downloads.networkChanged({connected: true, wifi: true});
        await downloads.initialize();
      };
      const quran = new QuranRuntime(
        catalog,
        downloads,
        initialize,
        'phase4-lab',
      );
      await initialize();
      if (scenario === 'phase4-install') {
        for (const pack of packs)
          await downloads.enqueue(pack.id, pack.version, false);
        const deadline = Date.now() + 600000;
        while (
          downloads.listInstalled().filter(p => p.state === 'ready').length <
          packs.length
        ) {
          if (Date.now() > deadline) throw Error('install_timeout');
          const failed = downloads.listJobs().filter(j => j.state === 'failed');
          if (failed.length)
            throw Error(
              JSON.stringify(
                failed.map(j => ({id: j.jobId, error: j.errorCode})),
              ),
            );
          setStatus(
            `Installing ${downloads.listJobs().filter(j => j.state === 'ready').length} files`,
          );
          await new Promise<void>(r => setTimeout(r, 500));
        }
        await log('phase4-installed', {
          packs: packs.length,
          jobs: downloads.listJobs().length,
        });
      }
      if (scenario === 'phase4-check') {
        const results = [];
        for (const t of catalog.texts) {
          for (const surah of [1, 2, 9, 112, 114]) {
            const chapter = await quran.chapter(t, surah);
            const family = await quran.font(t, chapter);
            results.push({
              edition: t.editionId,
              surah,
              verses: chapter.verses.length,
              fontFamily: family,
            });
          }
        }
        for (const t of catalog.translations) {
          const text = catalog.texts.find(p => p.editionId === t.editionId)!;
          const chapter = await quran.chapter(text, 1);
          const verses = await quran.translation(t, chapter, text);
          results.push({translation: t.id, verses: verses.length});
        }
        await log('phase4-reader-check', {results});
      }
      if (scenario === 'phase4-integrity')
        await require('./checks').checkRuntime(quran);
      setRuntime(quran);
    })().catch(error => {
      setStatus(String(error));
      void log('phase4-error', {error: String(error)});
    });
  }, [scenario]);
  return runtime ? (
    <QuranContext.Provider value={runtime}>
      <App />
    </QuranContext.Provider>
  ) : (
    <Text style={{margin: 40}}>{status}</Text>
  );
}
