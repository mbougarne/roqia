import importlib.util,json,shutil,subprocess,tempfile,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('patch_downloader',HERE/'patch-downloader.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PatchTest(unittest.TestCase):
 def test_exact_pinned_sources_apply_once_and_reject_drift(self):
  original=module.PACKAGE
  with tempfile.TemporaryDirectory() as directory:
   package=Path(directory);module.PACKAGE=package
   (package/'package.json').write_text('{"version":"4.6.3"}')
   for name in json.loads((HERE/'downloader-patch.json').read_text()):
    target=package/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(original/name,target)
   subprocess.run(['patch','-R','-p1','-i',str(HERE/'downloader.patch')],cwd=package,check=True,capture_output=True)
   module.main();module.main()
   file=package/'android/src/main/java/com/eko/ResumableDownloader.kt';file.write_text(file.read_text()+'// unexpected dependency drift\n')
   with self.assertRaisesRegex(RuntimeError,'differ'):module.main()
  module.PACKAGE=original
if __name__=='__main__':unittest.main()
