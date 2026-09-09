const TRAITS = [
  '爱吃鸡蛋的', '拒绝早起的', '下班失败的', '偷偷充电的', '正在摸鱼的', '忘带脑子的',
  '一碰就碎的', '擅长装忙的', '只喝冰水的', '被窝钉死的', '凌晨清醒的', '努力隐身的',
  '今天嘴硬的', '明天再说的', '电量不足的', '反复横跳的', '不想长大的', '正在缓冲的',
  '会偷月亮的', '把风吃掉的', '刚从火星来的', '被生活追着跑的', '周一过敏的', '工资未到账的',
  '只会点外卖的', '在逃但不着急的', '假装很懂的', '情绪稳定五分钟的', '偷偷发财的', '容易饿的',
  '没有坏心眼的', '偶尔靠谱的', '正在加载的', '拒绝内耗的', '今天不营业的', '灵魂出窍的',
];

const CHARACTERS = [
  '捣蛋鬼', '奥特曼', '咸蛋超人', '海绵勇士', '派大星邻居', '蜡笔小孩', '柯南同学', '卡比兽室友', '皮卡丘表弟',
  '蟹老板学徒', '面包超人助理', '樱桃小丸子同桌', '汤姆猫亲戚', '杰瑞鼠房东', '葫芦娃编外队员',
  '忍者龟文员', '赛博孙悟空', '银河猪猪侠', '失眠小熊', '暴躁企鹅', '社恐水豚', '迷路海豹', '加班河马',
  '塑料袋骑士', '拖鞋仙人', '泡面魔法师', '工位守护神', '地铁漂流瓶', '宇宙便利店员', '过期预言家',
  '鸽子总教练', '废话文学家', '沉默广播员', '野生哲学家', '临时主角', '反派实习生', '路过的大聪明',
];

export const anonymousNameCount = TRAITS.length * CHARACTERS.length * 999;

export const createAnonymousName = (random: () => number = Math.random) => {
  const trait = TRAITS[Math.floor(random() * TRAITS.length) % TRAITS.length];
  const character = CHARACTERS[Math.floor(random() * CHARACTERS.length) % CHARACTERS.length];
  const suffix = Math.floor(random() * 999) + 1;
  return `${trait}${character}${suffix}`;
};

export const senderHue = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) | 0;
  return 155 + Math.abs(hash % 92);
};
