// Typing games: catalogue, word lists, race passages and per-device best
// scores. Games are practice only — nothing here touches exam results.

export const GAMES = [
  { id: 'bubble', title: 'Bubble Typing', desc: 'Type the falling bubbles before they reach the bottom.', from: '#38BDF8', to: '#6366F1',
    how: 'Words fall inside bubbles. Type a word to pop it — no need to press space. Three bubbles reaching the bottom ends the game.' },
  { id: 'space', title: 'Space Defender', desc: 'Type to shoot the aliens and protect your spaceship.', from: '#4C1D95', to: '#1E293B',
    how: 'Aliens carry words towards your ship. Type a word to fire at that alien. Three aliens getting through ends the game.' },
  { id: 'nitro', title: 'Nitro Type', desc: 'Race computer cars by typing the passage as fast as you can.', from: '#111827', to: '#DC2626',
    how: 'Type the passage exactly. Your car moves with every correct character; a wrong key does not move you forward. Beat the three computer cars to the finish.' },
  { id: 'jungle', title: 'Key Jungle', desc: 'Type the words and help the monkey collect bananas.', from: '#65A30D', to: '#166534',
    how: 'Type each word and press Space. Every correct word earns a banana — longer words earn more. You have 60 seconds.' },
  { id: 'birds', title: 'Typing Birds', desc: 'Type the words to keep the bird flying.', from: '#38BDF8', to: '#22C55E',
    how: 'The bird keeps sinking. Type each word and press Space to flap it back up. Keep it off the ground as long as you can.' },
  { id: 'aqua', title: 'Aqua Typing', desc: 'Type the words and dive deeper in the ocean.', from: '#0EA5E9', to: '#0C4A6E',
    how: 'Type each word and press Space to dive. Correct words take you deeper; a mistake costs depth. You have 60 seconds.' },
  { id: 'blink', title: 'Play with Blink', desc: 'A word blinks on screen — type it from memory.', from: '#059669', to: '#065F46',
    how: 'Each word flashes for a moment and disappears. Type it from memory and press Space. Builds focus and reading speed. You have 60 seconds.' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);

export const LEVELS = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const EASY = `and the you was for are his had one our out day get has him how man new now old see two way who boy did its let put say she too use act add age ago air all any arm art ask bad bag bed big bit box bus buy can car cat cup cut dog dry ear eat egg end eye far fat few fit fly fun gas god gun hat hot ice job key kid lab law lay leg lie lot low map mix net nor not odd oil own pay pen pet pop pot raw red rid row run sad sea set sit six sky son sun tax tea ten tie tip top toy try war wet win yes yet zoo able also area army away back ball band bank base bear beat best bird blue boat body book born both call calm came card care case city club cold come cook cool copy core cost crew dark data date deal dear deep desk door down draw drop easy east edge else even ever face fact fair fall farm fast fear feel file fill film find fine fire firm fish five flat food foot form four free from full game gave gift girl give glad goal gold good grow hair half hall hand hard head hear heat held help here high hill hold home hope hour huge idea into iron item join just keep kind king knew know lack lady land last late lead left less life like line list live long look lose loss lost love made main make many mark mass meal meet mind miss mood more most move much must name near need news next nice nine none note open over page paid pain pair park part pass past path pick plan play plus pool poor post pull pure push race rain rate read real rest rich ride ring rise risk road rock role room rule safe said sale same save seat seen self sell send ship shop show side sign site size skin slow snow soft soil sold some song soon sort star stay step stop such sure take talk task team tell term test text than that them then they thin this time tiny told tone took tool tour town tree trip true turn type unit upon used user vast very view vote wait walk wall want warm wash wave weak wear week well went were west what when wide wife wild will wind wise wish with wood word work yard year your zero`.split(' ');

const MEDIUM = `about above actor adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among angle angry apart apple apply arena argue arise array aside asset audio avoid award aware badly basic beach begin being below bench birth black blade blame blank blind block blood board boost brain brand brave bread break brick brief bring broad brown build buyer cabin cable carry catch cause chain chair chart cheap check chest chief child civil claim class clean clear clerk click climb clock close cloud coach coast could count court cover craft crash cream crime cross crowd cycle daily dance death delay depth doubt dozen draft drama dream dress drink drive early earth eight elect empty enemy enjoy enter entry equal error event every exact exist extra faith false fault field fifty fight final first flash fleet floor focus force frame fresh front fruit funny giant given glass grade grand grant grass great green group guard guess guest guide happy heart heavy horse hotel house human ideal image index inner input issue joint judge known label large later laugh layer learn least leave legal level light limit local logic loose lucky lunch major maker march match maybe mayor media metal minor model money month moral motor mount mouse mouth movie music never night noise north novel nurse occur ocean offer often order other outer owner paint panel paper party peace phase phone photo piece pilot pitch place plain plane plant plate point power press price pride prime print prior prize proof proud prove queen quick quiet quite radio raise range rapid ratio reach ready refer reply right river rough round route royal rural scale scene scope score sense serve seven shape share sharp sheet shelf shift shirt shock shoot short sight skill sleep slide small smart smile smoke solid solve sound south space speak speed spend spent sport staff stage stand start state steam steel stick still stock stone store storm story strip study style sugar sweet table taken taste teach thank theme thick thing think third three throw tight title today topic total touch tough tower track trade train treat trend trial trust truth twice under union until upper upset urban usage usual valid value video visit vital voice waste watch water wheel where which while white whole woman world worry write wrong young youth`.split(' ');

const HARD = `ability absence academy account achieve acquire address advance adviser airport amazing analyst ancient another anxiety anybody applied arrange article assault attempt attract average balance banking barrier battery bearing because bedroom believe benefit between brother cabinet capable capital captain careful ceiling central century certain chamber channel chapter charity chicken citizen climate collect college combine comfort command comment company compare complex concept concern conduct confirm connect consent consist contact contain content contest context control convert correct council counter country courage crucial culture current dealing decline default defence deficit deliver density deposit desktop despite destroy develop digital discuss disease display distant drawing driving dynamic economy edition element emotion empower engaged enhance evening evident examine example excited exclude execute expense explain explore express extreme factory failure fashion feature federal finance finding fishing flavour foreign fortune forward freedom further gallery general genuine gesture glimpse grammar greater healthy hearing heavily helpful history holiday housing however hundred husband illness imagine improve include initial insight install instant interim invest journey justice keyboard kitchen landing largely lawyer leading learned library lifting limited machine manager married massive maximum meaning measure medical meeting mention message million mineral minimum minister missing mission mistake mixture monitor morning musical mystery natural neither network nothing notable nuclear obvious officer opening operate opinion organic outcome outside overall pacific package painter partner passage passion patient pattern payment penalty pension percent perfect perhaps physics picture pioneer plastic pointed popular portion poverty precise predict premium prepare present prevent primary printer privacy private problem proceed process produce product profile program project promise protect protein provide publish purpose quality quarter radical railway reading reality receive recover reflect regular related release remains replace request require reserve resolve respect respond restore revenue reverse routine running science section segment serious service session setting several shelter silence similar society soldier speaker special sponsor station storage strange student subject succeed success suggest summary support surface survive suspect teacher tension theatre therapy thought through tonight totally tourism traffic trouble typical uniform unknown unusual upgrade variety various vehicle venture version veteran victory village violent virtual visible waiting weather website wedding weekend welcome welfare western whether willing without witness working writing`.split(' ');

export const WORDS = { easy: EASY, medium: MEDIUM, hard: HARD };

export function randomWord(level, avoid = []) {
  const list = WORDS[level] || EASY;
  for (let i = 0; i < 8; i++) {
    const w = list[Math.floor(Math.random() * list.length)];
    if (!avoid.some((a) => a[0] === w[0])) return w;
  }
  return list[Math.floor(Math.random() * list.length)];
}

// Original practice passages for the race.
export const PASSAGES = {
  easy: [
    'Practice a little every day and your typing will grow faster. Keep your eyes on the screen and let your fingers find the keys.',
    'A good typist sits up straight, keeps the wrists light and types with all ten fingers. Speed comes after accuracy, not before.',
  ],
  medium: [
    'Steady practice builds speed and confidence. When you make a mistake, correct it calmly and carry on, because rhythm matters more than rushing through the passage.',
    'Every competitive examination rewards candidates who stay calm under pressure. Read the passage carefully, maintain a steady pace and avoid unnecessary corrections.',
  ],
  hard: [
    'Government skill tests measure both speed and accuracy, so candidates should practise with varied passages, including numbers like 1,250 and punctuation such as commas, colons; and full stops.',
    'Efficient transcription depends on concentration, posture and technique. Experienced typists anticipate common word patterns, which allows them to maintain 40 words per minute without sacrificing precision.',
  ],
};

export const randomPassage = (level) => {
  const list = PASSAGES[level] || PASSAGES.easy;
  return list[Math.floor(Math.random() * list.length)];
};

// Best score per student, game and level, stored on this device.
const bestKey = (game, level) => `typing-games-best:${localStorage.getItem('userId') || 'guest'}:${game}:${level}`;
export function getBest(game, level) {
  try { return JSON.parse(localStorage.getItem(bestKey(game, level)) || 'null'); } catch { return null; }
}
export function saveBest(game, level, result) {
  const prev = getBest(game, level);
  if (prev && prev.score >= result.score) return false;
  try { localStorage.setItem(bestKey(game, level), JSON.stringify({ score: result.score, wpm: result.wpm, accuracy: result.accuracy, at: Date.now() })); } catch { /* storage unavailable */ }
  return true;
}
export function bestOverall(game) {
  return LEVELS.map((l) => getBest(game, l.id)).filter(Boolean).sort((a, b) => b.score - a.score)[0] || null;
}

// Typing statistics shared by all games.
export function computeStats({ correctChars, keystrokes, errors, elapsedMs }) {
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  return {
    wpm: Math.round(correctChars / 5 / minutes),
    accuracy: keystrokes > 0 ? Math.max(0, Math.round(((keystrokes - errors) / keystrokes) * 100)) : 100,
  };
}
