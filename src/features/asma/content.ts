import supplied from './1792441861026.json';

export const source = {
  title: 'أسماء الله الحسنى',
  url: 'https://surahquran.com/99-Names-of-Allah-with-Meaning.html',
  inputSHA256:
    '187a94be69913f5c68e952c7507203300ddb20b650b62165ad24254b6e0f2ccf',
};

// The supplied names, meanings, quotations and source numbers stay verbatim.
export const names = supplied.map(row => ({
  name: row['الاسم'],
  meaning: row['المعنى'],
}));
