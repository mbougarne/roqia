"""Run the production Java cmap validator against every original Quran codepoint."""
import json, os, subprocess, tempfile, unittest, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
JAVA = Path(os.environ.get('JAVA_HOME', '/Users/mbougarne/.sdkman/candidates/java/current')) / 'bin'
class FontCoverageTest(unittest.TestCase):
 def test_original_fonts_cover_corpora_and_reject_missing_or_malformed_fonts(self):
  with tempfile.TemporaryDirectory() as directory:
   tmp=Path(directory)
   harness=tmp/'CoverageCheck.java'
   harness.write_text('''import name.roqia.app.reader.FontCoverage; import java.io.*; import java.nio.file.*; public class CoverageCheck {public static void main(String[] args) throws Exception {FontCoverage f=new FontCoverage(new File(args[0]));String text=new String(Files.readAllBytes(Paths.get(args[1])),"UTF-8");f.require(text);if(f.has(0x10ffff))throw new AssertionError("missing glyph accepted");try{f.require("\\ud83e\\udd84");throw new AssertionError("emoji accepted");}catch(IOException expected){} System.out.println("covered "+text.codePointCount(0,text.length())+" codepoints");}}''')
   subprocess.run([str(JAVA/'javac'),'-d',str(tmp),str(ROOT/'android/app/src/main/java/name/roqia/app/reader/FontCoverage.java'),str(harness)],check=True,capture_output=True)
   z=zipfile.ZipFile(ROOT/'.roqia-feasibility/sources/UthmanicWarsh_v2-1.zip')
   warsh=json.loads(z.read('UthmanicWarsh_v2-1 data/warshData_v2-1.json'))
   texts=[''.join(r['aya_text'] for r in warsh),''.join(v['text'] for p in sorted((ROOT/'.roqia-feasibility/packs/hafs-tanzil-uthmani-1.1/chapters').glob('*.json')) for v in json.loads(p.read_text())['verses'])]
   fonts=[z.read('UthmanicWarsh_v2-1 font/uthmanic_warsh_v21.ttf'),(ROOT/'src/assets/fonts/NotoSansArabic.ttf').read_bytes()]
   for name,text,font in zip(['warsh','hafs'],texts,fonts):
    fp=tmp/(name+'.ttf');fp.write_bytes(font);tp=tmp/(name+'.txt');tp.write_text(text)
    result=subprocess.run([str(JAVA/'java'),'-cp',str(tmp),'CoverageCheck',str(fp),str(tp)],capture_output=True,text=True)
    self.assertEqual(result.returncode,0,result.stderr)
    print(name,result.stdout.strip())
   bad=tmp/'bad.ttf';bad.write_bytes(b'\xff'*100)
   result=subprocess.run([str(JAVA/'java'),'-cp',str(tmp),'CoverageCheck',str(bad),str(tp)],capture_output=True)
   self.assertNotEqual(result.returncode,0)
if __name__=='__main__':unittest.main()
