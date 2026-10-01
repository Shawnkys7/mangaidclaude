const KNOWN_AUTHORS: Record<string, string> = {
  'one-piece': 'Eiichiro Oda',
  'komik-one-piece': 'Eiichiro Oda',
  'boruto': 'Masashi Kishimoto / Mikio Ikemoto',
  'boruto-two-blue-vortex': 'Masashi Kishimoto / Mikio Ikemoto',
  'dandadan': 'Yukinobu Tatsu',
  'spy-x-family': 'Tatsuya Endo',
  'sakamoto-days': 'Yuto Suzuki',
  'jujutsu-kaisen': 'Gege Akutami',
  'naruto': 'Masashi Kishimoto',
  'bleach': 'Tite Kubo',
  'chainsaw-man': 'Tatsuki Fujimoto',
  'black-clover': 'Yūki Tabata',
  'solo-leveling': 'Chugong',
  'reincarnation-of-the-suicidal-battle-god': 'Blue-Deep',
  'stalker-x-stalker': 'Merryweatherey',
  'kudan-no-ken-ni-tsuite': 'Wada Ryuu',
  'tensei-shitara-dai-nana-ouji-dattanode-kimamani-majutsu-o-kiwamemasu': 'Kenkyo na Circle',
  'a-wimps-strategy-guide-to-conquer-the-tower': 'Kim Tae-Kyung',
  'dragon-ball': 'Akira Toriyama',
  'hunter-x-hunter': 'Yoshihiro Togashi',
  'detective-conan': 'Gosho Aoyama',
  'nano-machine': 'Jeol-mu Han-jung',
  'omniscient-reader': 'Sing-Shong',
  'the-beginning-after-the-end': 'TurtleMe',
  'from-goblin-to-goblin-god': 'Komikus',
  'full-time-awakening': 'Komikus',
  'magic-emperor': 'Ye Xiao',
  'one-punch-man': 'ONE / Yusuke Murata',
  'blue-lock': 'Muneyuki Kaneshiro',
  'boku-no-hero-academia': 'Kohei Horikoshi',
  'my-hero-academia': 'Kohei Horikoshi',
  'kimetsu-no-yaiba': 'Koyoharu Gotouge',
  'demon-slayer': 'Koyoharu Gotouge',
};

export function getMangaAuthor(title: string, endpoint: string): string {
  const epKey = endpoint.toLowerCase();
  const titleKey = title.toLowerCase();
  for (const [key, val] of Object.entries(KNOWN_AUTHORS)) {
    if (epKey.includes(key) || titleKey.includes(key.replace(/-/g, ' '))) {
      return val;
    }
  }
  return 'Komikus';
}
