export const SEMANTIC_CLUSTERS = {
  numbers: [
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '百', '千', '万', '円'
  ],
  time: [
    '日', '月', '年', '時', '分', '前', '後', '今', '昨', '明',
    '午', '半', '週', '毎', '間'
  ],
  family: [
    '人', '男', '女', '子', '父', '母', '兄', '弟', '姉', '妹',
    '家', '友', '親', '族'
  ],
  nature: [
    '水', '火', '木', '土', '金', '山', '川', '海', '風', '雨',
    '天', '空', '石', '林', '森', '花', '草'
  ],
  actions: [
    '見', '行', '来', '食', '飲', '読', '書', '聞', '話', '買',
    '売', '作', '立', '座', '走', '歩', '止', '入', '出', '会'
  ],
  body: [
    '手', '足', '目', '口', '耳', '頭', '心', '体', '顔', '首',
    '指', '髪', '声', '力'
  ],
  places: [
    '国', '町', '村', '市', '都', '京', '駅', '店', '校', '院',
    '館', '場', '所'
  ],
  directions: [
    '東', '西', '南', '北', '上', '下', '左', '右', '中', '外',
    '内', '間'
  ],
  education: [
    '学', '校', '生', '先', '教', '習', '勉', '試', '験', '文',
    '字', '語', '英'
  ],
  colors: [
    '赤', '青', '白', '黒', '色', '茶'
  ]
} as const;

export type ClusterName = keyof typeof SEMANTIC_CLUSTERS;

export function findCluster(kanji: string): ClusterName | null {
  for (const [clusterName, kanjiList] of Object.entries(SEMANTIC_CLUSTERS)) {
    if ((kanjiList as readonly string[]).includes(kanji)) {
      return clusterName as ClusterName;
    }
  }
  return null;
}

export function getClusterMembers(kanji: string): string[] {
  const cluster = findCluster(kanji);
  if (!cluster) return [];

  return SEMANTIC_CLUSTERS[cluster].filter(k => k !== kanji);
}
