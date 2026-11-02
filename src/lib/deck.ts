export interface Card {
  id: string;
  hanzi: string;
  /** Display-only hint, never accepted as an answer. */
  pinyin: string;
  /** Accepted German answers; the first one is shown as "the" answer. */
  de: string[];
}

// Mini deck for the MVP: a handful of HSK 1 words. The full HSK 1–2 deck
// (HanDeDict glosses) comes with milestone 2.
export const CARDS: Card[] = [
  { id: "pingguo", hanzi: "苹果", pinyin: "píng guǒ", de: ["der Apfel"] },
  { id: "shui", hanzi: "水", pinyin: "shuǐ", de: ["das Wasser"] },
  { id: "cha", hanzi: "茶", pinyin: "chá", de: ["der Tee"] },
  { id: "mifan", hanzi: "米饭", pinyin: "mǐ fàn", de: ["der Reis"] },
  { id: "mao", hanzi: "猫", pinyin: "māo", de: ["die Katze"] },
  { id: "gou", hanzi: "狗", pinyin: "gǒu", de: ["der Hund"] },
  { id: "shu", hanzi: "书", pinyin: "shū", de: ["das Buch"] },
  { id: "xuexiao", hanzi: "学校", pinyin: "xué xiào", de: ["die Schule"] },
  { id: "laoshi", hanzi: "老师", pinyin: "lǎo shī", de: ["der Lehrer", "die Lehrerin"] },
  { id: "xuesheng", hanzi: "学生", pinyin: "xué sheng", de: ["der Schüler", "die Schülerin", "der Student", "die Studentin"] },
  { id: "pengyou", hanzi: "朋友", pinyin: "péng you", de: ["der Freund", "die Freundin"] },
  { id: "yisheng", hanzi: "医生", pinyin: "yī shēng", de: ["der Arzt", "die Ärztin"] },
  { id: "feiji", hanzi: "飞机", pinyin: "fēi jī", de: ["das Flugzeug"] },
  { id: "chuzuche", hanzi: "出租车", pinyin: "chū zū chē", de: ["das Taxi"] },
  { id: "diannao", hanzi: "电脑", pinyin: "diàn nǎo", de: ["der Computer"] },
  { id: "dianshi", hanzi: "电视", pinyin: "diàn shì", de: ["der Fernseher", "das Fernsehen"] },
  { id: "dianying", hanzi: "电影", pinyin: "diàn yǐng", de: ["der Film"] },
  { id: "yifu", hanzi: "衣服", pinyin: "yī fu", de: ["die Kleidung"] },
  { id: "zhuozi", hanzi: "桌子", pinyin: "zhuō zi", de: ["der Tisch"] },
  { id: "yizi", hanzi: "椅子", pinyin: "yǐ zi", de: ["der Stuhl"] },
  { id: "beizi", hanzi: "杯子", pinyin: "bēi zi", de: ["die Tasse", "der Becher", "das Glas"] },
  { id: "qian", hanzi: "钱", pinyin: "qián", de: ["das Geld"] },
  { id: "tianqi", hanzi: "天气", pinyin: "tiān qì", de: ["das Wetter"] },
  { id: "jintian", hanzi: "今天", pinyin: "jīn tiān", de: ["heute"] },
  { id: "mingtian", hanzi: "明天", pinyin: "míng tiān", de: ["morgen"] },
  { id: "zuotian", hanzi: "昨天", pinyin: "zuó tiān", de: ["gestern"] },
  { id: "chi", hanzi: "吃", pinyin: "chī", de: ["essen"] },
  { id: "he", hanzi: "喝", pinyin: "hē", de: ["trinken"] },
  { id: "kan", hanzi: "看", pinyin: "kàn", de: ["sehen", "schauen", "lesen", "anschauen"] },
  { id: "da", hanzi: "大", pinyin: "dà", de: ["groß"] },
  { id: "xiao", hanzi: "小", pinyin: "xiǎo", de: ["klein"] },
  { id: "re", hanzi: "热", pinyin: "rè", de: ["heiß"] },
  { id: "leng", hanzi: "冷", pinyin: "lěng", de: ["kalt"] },
  { id: "xiexie", hanzi: "谢谢", pinyin: "xiè xie", de: ["danke"] },
  { id: "zaijian", hanzi: "再见", pinyin: "zài jiàn", de: ["auf Wiedersehen", "tschüss"] },
  { id: "zhongguo", hanzi: "中国", pinyin: "Zhōng guó", de: ["China"] },
];
