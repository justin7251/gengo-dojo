export type Script = 'hiragana' | 'katakana';

export interface KanaChar {
  char: string;
  romaji: string;
  mnemonic: string;
  row: string;
  script: Script;
}

export const HIRAGANA: KanaChar[] = [
  // Vowels
  { char: 'あ', romaji: 'a',   mnemonic: 'Looks like an "a" with a curl',       row: 'vowels',  script: 'hiragana' },
  { char: 'い', romaji: 'i',   mnemonic: 'Two strokes like two "i"s standing',  row: 'vowels',  script: 'hiragana' },
  { char: 'う', romaji: 'u',   mnemonic: 'Looks like a "u" with a hat',         row: 'vowels',  script: 'hiragana' },
  { char: 'え', romaji: 'e',   mnemonic: 'Resembles a person gesturing',        row: 'vowels',  script: 'hiragana' },
  { char: 'お', romaji: 'o',   mnemonic: 'Looks like a person doing a dance',   row: 'vowels',  script: 'hiragana' },
  // K row
  { char: 'か', romaji: 'ka',  mnemonic: 'A knife cutting — KA!',               row: 'k',  script: 'hiragana' },
  { char: 'き', romaji: 'ki',  mnemonic: 'Looks like a KEY',                    row: 'k',  script: 'hiragana' },
  { char: 'く', romaji: 'ku',  mnemonic: 'A bird beak going KOO',               row: 'k',  script: 'hiragana' },
  { char: 'け', romaji: 'ke',  mnemonic: 'Looks like KE-tchup bottle',          row: 'k',  script: 'hiragana' },
  { char: 'こ', romaji: 'ko',  mnemonic: 'Two lines like a COt',                row: 'k',  script: 'hiragana' },
  // S row
  { char: 'さ', romaji: 'sa',  mnemonic: 'Looks like SAd face sideways',        row: 's',  script: 'hiragana' },
  { char: 'し', romaji: 'shi', mnemonic: 'A fishhook — SHE caught a fish',      row: 's',  script: 'hiragana' },
  { char: 'す', romaji: 'su',  mnemonic: 'A swan — SOO graceful',               row: 's',  script: 'hiragana' },
  { char: 'せ', romaji: 'se',  mnemonic: 'Looks like SEt of stairs',            row: 's',  script: 'hiragana' },
  { char: 'そ', romaji: 'so',  mnemonic: 'A curly SOck',                        row: 's',  script: 'hiragana' },
  // T row
  { char: 'た', romaji: 'ta',  mnemonic: 'Looks like a TA-ble with legs',       row: 't',  script: 'hiragana' },
  { char: 'ち', romaji: 'chi', mnemonic: 'CHEEky smile shape',                  row: 't',  script: 'hiragana' },
  { char: 'つ', romaji: 'tsu', mnemonic: 'A TSUnami wave curling',              row: 't',  script: 'hiragana' },
  { char: 'て', romaji: 'te',  mnemonic: 'A TEa cup handle',                    row: 't',  script: 'hiragana' },
  { char: 'と', romaji: 'to',  mnemonic: 'A TOe with a nail',                   row: 't',  script: 'hiragana' },
  // N row
  { char: 'な', romaji: 'na',  mnemonic: 'A kNife cutting NAps',                row: 'n',  script: 'hiragana' },
  { char: 'に', romaji: 'ni',  mnemonic: 'Looks like a NEEdle and thread',      row: 'n',  script: 'hiragana' },
  { char: 'ぬ', romaji: 'nu',  mnemonic: 'NOOdles twisting around',             row: 'n',  script: 'hiragana' },
  { char: 'ね', romaji: 'ne',  mnemonic: 'A cat NEsting — NEko!',               row: 'n',  script: 'hiragana' },
  { char: 'の', romaji: 'no',  mnemonic: 'A NOose swirl — NO dont do it',       row: 'n',  script: 'hiragana' },
  // H row
  { char: 'は', romaji: 'ha',  mnemonic: 'HA! Laughing face shape',             row: 'h',  script: 'hiragana' },
  { char: 'ひ', romaji: 'hi',  mnemonic: 'A HEEl shape',                        row: 'h',  script: 'hiragana' },
  { char: 'ふ', romaji: 'fu',  mnemonic: 'Mount FUji with clouds',              row: 'h',  script: 'hiragana' },
  { char: 'へ', romaji: 'he',  mnemonic: 'A mountain — HEy look at that peak', row: 'h',  script: 'hiragana' },
  { char: 'ほ', romaji: 'ho',  mnemonic: 'HO HO HO Santa shape',               row: 'h',  script: 'hiragana' },
  // M row
  { char: 'ま', romaji: 'ma',  mnemonic: 'MAma fishing with a rod',             row: 'm',  script: 'hiragana' },
  { char: 'み', romaji: 'mi',  mnemonic: 'MEaning — two hooks like ears',       row: 'm',  script: 'hiragana' },
  { char: 'む', romaji: 'mu',  mnemonic: 'A cow going MOO',                     row: 'm',  script: 'hiragana' },
  { char: 'め', romaji: 'me',  mnemonic: 'An eye — MEganē means glasses',       row: 'm',  script: 'hiragana' },
  { char: 'も', romaji: 'mo',  mnemonic: 'MORe hooks for fishing',              row: 'm',  script: 'hiragana' },
  // Y row
  { char: 'や', romaji: 'ya',  mnemonic: 'A YAk with horns',                    row: 'y',  script: 'hiragana' },
  { char: 'ゆ', romaji: 'yu',  mnemonic: 'A YOU-niverse swirling',              row: 'y',  script: 'hiragana' },
  { char: 'よ', romaji: 'yo',  mnemonic: 'YO! A person waving',                 row: 'y',  script: 'hiragana' },
  // R row
  { char: 'ら', romaji: 'ra',  mnemonic: 'A RAbit ear sticking up',             row: 'r',  script: 'hiragana' },
  { char: 'り', romaji: 'ri',  mnemonic: 'Two REeds standing tall',             row: 'r',  script: 'hiragana' },
  { char: 'る', romaji: 'ru',  mnemonic: 'A ROOster tail curling',              row: 'r',  script: 'hiragana' },
  { char: 'れ', romaji: 're',  mnemonic: 'A REd flowing ribbon',                row: 'r',  script: 'hiragana' },
  { char: 'ろ', romaji: 'ro',  mnemonic: 'ROad bending ahead',                  row: 'r',  script: 'hiragana' },
  // W row
  { char: 'わ', romaji: 'wa',  mnemonic: 'A WAtch strap with a clasp',         row: 'w',  script: 'hiragana' },
  { char: 'を', romaji: 'wo',  mnemonic: 'WOah — the object marker!',           row: 'w',  script: 'hiragana' },
  // N
  { char: 'ん', romaji: 'n',   mnemonic: 'N is for eNd — last hiragana!',       row: 'n2', script: 'hiragana' },
];

export const KATAKANA: KanaChar[] = [
  // Vowels
  { char: 'ア', romaji: 'a',   mnemonic: 'Looks like an uppercase A without the crossbar', row: 'vowels', script: 'katakana' },
  { char: 'イ', romaji: 'i',   mnemonic: 'Looks like a leaning person — EEk!',             row: 'vowels', script: 'katakana' },
  { char: 'ウ', romaji: 'u',   mnemonic: 'A crown shape — OOh fancy!',                     row: 'vowels', script: 'katakana' },
  { char: 'エ', romaji: 'e',   mnemonic: 'An I-beam / H shape — Engineering',              row: 'vowels', script: 'katakana' },
  { char: 'オ', romaji: 'o',   mnemonic: 'Looks like a person with an arm out — Oh!',      row: 'vowels', script: 'katakana' },
  // K row
  { char: 'カ', romaji: 'ka',  mnemonic: 'Looks like a KArate chop',                       row: 'k', script: 'katakana' },
  { char: 'キ', romaji: 'ki',  mnemonic: 'A KEY with teeth',                               row: 'k', script: 'katakana' },
  { char: 'ク', romaji: 'ku',  mnemonic: 'A bird beak — KOO koo!',                         row: 'k', script: 'katakana' },
  { char: 'ケ', romaji: 'ke',  mnemonic: 'KE — like a flag on a pole',                     row: 'k', script: 'katakana' },
  { char: 'コ', romaji: 'ko',  mnemonic: 'Two lines like a COrner',                        row: 'k', script: 'katakana' },
  // S row
  { char: 'サ', romaji: 'sa',  mnemonic: 'SAmuRAi with a sword',                           row: 's', script: 'katakana' },
  { char: 'シ', romaji: 'shi', mnemonic: 'SHEep with three strokes',                       row: 's', script: 'katakana' },
  { char: 'ス', romaji: 'su',  mnemonic: 'A SWing set from the side',                      row: 's', script: 'katakana' },
  { char: 'セ', romaji: 'se',  mnemonic: 'SEt square — an L shape with a lid',             row: 's', script: 'katakana' },
  { char: 'ソ', romaji: 'so',  mnemonic: 'SOrt of like a check mark',                      row: 's', script: 'katakana' },
  // T row
  { char: 'タ', romaji: 'ta',  mnemonic: 'TAlon of a bird reaching down',                  row: 't', script: 'katakana' },
  { char: 'チ', romaji: 'chi', mnemonic: 'CHEers — a raised cup shape',                    row: 't', script: 'katakana' },
  { char: 'ツ', romaji: 'tsu', mnemonic: 'TSUnami — two dots and a wave',                  row: 't', script: 'katakana' },
  { char: 'テ', romaji: 'te',  mnemonic: 'A TElevision antenna on a roof',                 row: 't', script: 'katakana' },
  { char: 'ト', romaji: 'to',  mnemonic: 'A TOtem pole with a spike',                      row: 't', script: 'katakana' },
  // N row
  { char: 'ナ', romaji: 'na',  mnemonic: 'A cross — NAme your blessing',                   row: 'n', script: 'katakana' },
  { char: 'ニ', romaji: 'ni',  mnemonic: 'Two equal lines — NEat and tidy',                row: 'n', script: 'katakana' },
  { char: 'ヌ', romaji: 'nu',  mnemonic: 'NOOdles in a bowl with chopsticks',              row: 'n', script: 'katakana' },
  { char: 'ネ', romaji: 'ne',  mnemonic: 'NEt on a post — catch something!',               row: 'n', script: 'katakana' },
  { char: 'ノ', romaji: 'no',  mnemonic: 'A NOd — one diagonal slash',                     row: 'n', script: 'katakana' },
  // H row
  { char: 'ハ', romaji: 'ha',  mnemonic: 'Two legs — HA look at me walk!',                 row: 'h', script: 'katakana' },
  { char: 'ヒ', romaji: 'hi',  mnemonic: 'HEEl shape — like a shoe',                       row: 'h', script: 'katakana' },
  { char: 'フ', romaji: 'fu',  mnemonic: 'A HOOk — FU-nny little hook',                    row: 'h', script: 'katakana' },
  { char: 'ヘ', romaji: 'he',  mnemonic: 'A mountain peak — HEllo up there',               row: 'h', script: 'katakana' },
  { char: 'ホ', romaji: 'ho',  mnemonic: 'A cross with extra legs — HOly!',                row: 'h', script: 'katakana' },
  // M row
  { char: 'マ', romaji: 'ma',  mnemonic: 'MAsterful angle — sharp corner',                 row: 'm', script: 'katakana' },
  { char: 'ミ', romaji: 'mi',  mnemonic: 'Three MIni strokes',                             row: 'm', script: 'katakana' },
  { char: 'ム', romaji: 'mu',  mnemonic: 'MOOse head — antlers and snout',                 row: 'm', script: 'katakana' },
  { char: 'メ', romaji: 'me',  mnemonic: 'An X marks the spot — MEmo it!',                 row: 'm', script: 'katakana' },
  { char: 'モ', romaji: 'mo',  mnemonic: 'MORe lines — three horizontal bars',             row: 'm', script: 'katakana' },
  // Y row
  { char: 'ヤ', romaji: 'ya',  mnemonic: 'YAk horns curving up',                           row: 'y', script: 'katakana' },
  { char: 'ユ', romaji: 'yu',  mnemonic: 'A YOU-tube play button shape',                   row: 'y', script: 'katakana' },
  { char: 'ヨ', romaji: 'yo',  mnemonic: 'YO! Three rungs of a ladder',                    row: 'y', script: 'katakana' },
  // R row
  { char: 'ラ', romaji: 'ra',  mnemonic: 'RAndom angle — sharp and quick',                 row: 'r', script: 'katakana' },
  { char: 'リ', romaji: 'ri',  mnemonic: 'Two REeds — tall and thin',                      row: 'r', script: 'katakana' },
  { char: 'ル', romaji: 'ru',  mnemonic: 'RUle — like an L with a foot',                   row: 'r', script: 'katakana' },
  { char: 'レ', romaji: 're',  mnemonic: 'A single REaching stroke downward',              row: 'r', script: 'katakana' },
  { char: 'ロ', romaji: 'ro',  mnemonic: 'A ROom — four walls, no roof',                   row: 'r', script: 'katakana' },
  // W row
  { char: 'ワ', romaji: 'wa',  mnemonic: 'WAtch — a circle with a stem',                   row: 'w', script: 'katakana' },
  { char: 'ヲ', romaji: 'wo',  mnemonic: 'WOah — rare object marker',                      row: 'w', script: 'katakana' },
  // N
  { char: 'ン', romaji: 'n',   mnemonic: 'N — almost like ソ but different angle',          row: 'n2', script: 'katakana' },
];

export const ALL_KANA = [...HIRAGANA, ...KATAKANA];

export const ROW_ORDER = ['vowels', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'n2'];
export const ROW_LABELS: Record<string, string> = {
  vowels: 'Vowels',
  k: 'K row', s: 'S row', t: 'T row',
  n: 'N row', h: 'H row', m: 'M row',
  y: 'Y row', r: 'R row', w: 'W row',
  n2: 'N (final)',
};