/*
# 创建塔罗牌占卜系统数据表

## 1. 新建表

### tarot_cards (塔罗牌数据表)
- `id` (bigserial, 主键) - 牌的ID
- `name_cn` (text, 非空) - 中文牌名
- `name_en` (text, 非空) - 英文牌名
- `card_type` (text, 非空) - 牌类型: 'major'(大阿卡纳) 或 'minor'(小阿卡纳)
- `suit` (text, 可空) - 牌组: 'wands'(权杖), 'cups'(圣杯), 'swords'(宝剑), 'pentacles'(星币), null(大阿卡纳)
- `number` (int, 非空) - 牌序号
- `image_url` (text, 非空) - 牌面图片URL
- `keywords_upright` (text[], 非空) - 正位关键词数组
- `keywords_reversed` (text[], 非空) - 逆位关键词数组
- `meaning_upright` (text, 非空) - 正位含义
- `meaning_reversed` (text, 非空) - 逆位含义
- `advice_upright` (text, 非空) - 正位建议
- `advice_reversed` (text, 非空) - 逆位建议
- `element` (text, 可空) - 元素属性
- `created_at` (timestamptz, 默认now())

### spread_types (牌阵类型表)
- `id` (bigserial, 主键)
- `name` (text, 非空, 唯一) - 牌阵名称
- `description` (text, 非空) - 牌阵描述
- `card_count` (int, 非空) - 需要抽取的牌数
- `positions` (jsonb, 非空) - 牌位说明JSON数组
- `category` (text, 非空) - 分类: 'basic'(基础), 'classic'(经典), 'theme'(主题)
- `theme` (text, 可空) - 主题类型(仅主题牌阵)
- `sort_order` (int, 默认0) - 排序
- `created_at` (timestamptz, 默认now())

### divination_records (占卜记录表)
- `id` (uuid, 主键, 默认gen_random_uuid())
- `user_id` (text, 非空) - 用户标识(使用UUID字符串)
- `question` (text, 可空) - 用户问题
- `spread_type_id` (bigint, 外键) - 牌阵类型ID
- `cards_drawn` (jsonb, 非空) - 抽取的牌信息JSON数组
- `created_at` (timestamptz, 默认now())

## 2. 安全策略
- 所有表不启用RLS,允许公开访问
- 用户可以查看和创建占卜记录
- 塔罗牌数据和牌阵类型为只读数据

## 3. 索引
- 为常用查询字段创建索引以提升性能
*/

-- 创建塔罗牌数据表
CREATE TABLE IF NOT EXISTS tarot_cards (
  id bigserial PRIMARY KEY,
  name_cn text NOT NULL,
  name_en text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('major', 'minor')),
  suit text CHECK (suit IN ('wands', 'cups', 'swords', 'pentacles') OR suit IS NULL),
  number int NOT NULL,
  image_url text NOT NULL,
  keywords_upright text[] NOT NULL,
  keywords_reversed text[] NOT NULL,
  meaning_upright text NOT NULL,
  meaning_reversed text NOT NULL,
  advice_upright text NOT NULL,
  advice_reversed text NOT NULL,
  element text,
  created_at timestamptz DEFAULT now()
);

-- 创建牌阵类型表
CREATE TABLE IF NOT EXISTS spread_types (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  card_count int NOT NULL,
  positions jsonb NOT NULL,
  category text NOT NULL CHECK (category IN ('basic', 'classic', 'theme')),
  theme text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 创建占卜记录表
CREATE TABLE IF NOT EXISTS divination_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  question text,
  spread_type_id bigint REFERENCES spread_types(id),
  cards_drawn jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tarot_cards_type ON tarot_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit);
CREATE INDEX IF NOT EXISTS idx_spread_types_category ON spread_types(category);
CREATE INDEX IF NOT EXISTS idx_divination_records_user ON divination_records(user_id);
CREATE INDEX IF NOT EXISTS idx_divination_records_created ON divination_records(created_at DESC);

-- 插入牌阵类型数据
INSERT INTO spread_types (name, description, card_count, positions, category, theme, sort_order) VALUES
('单张牌', '快速占卜,适合是否类问题,获得简洁明确的指引', 1, '[{"position": 1, "meaning": "核心指引"}]', 'basic', NULL, 1),
('三张牌阵', '经典时间流分析,了解事件的发展脉络', 3, '[{"position": 1, "meaning": "过去"}, {"position": 2, "meaning": "现在"}, {"position": 3, "meaning": "未来"}]', 'classic', NULL, 2),
('凯尔特十字', '深度全面解析,适合复杂问题的多维度分析', 10, '[{"position": 1, "meaning": "现状"}, {"position": 2, "meaning": "挑战"}, {"position": 3, "meaning": "根源"}, {"position": 4, "meaning": "过去"}, {"position": 5, "meaning": "目标"}, {"position": 6, "meaning": "未来"}, {"position": 7, "meaning": "自我"}, {"position": 8, "meaning": "环境"}, {"position": 9, "meaning": "希望与恐惧"}, {"position": 10, "meaning": "最终结果"}]', 'classic', NULL, 3),
('爱情关系', '探索情感状态与亲密关系发展', 3, '[{"position": 1, "meaning": "你的状态"}, {"position": 2, "meaning": "对方的状态"}, {"position": 3, "meaning": "关系走向"}]', 'theme', 'love', 4),
('职业发展', '分析事业现状与未来机遇', 3, '[{"position": 1, "meaning": "当前职业状态"}, {"position": 2, "meaning": "发展机遇"}, {"position": 3, "meaning": "行动建议"}]', 'theme', 'career', 5),
('财务状况', '了解财务现状与投资方向', 3, '[{"position": 1, "meaning": "财务现状"}, {"position": 2, "meaning": "影响因素"}, {"position": 3, "meaning": "改善方向"}]', 'theme', 'finance', 6),
('学业考试', '评估学习状态与考试运势', 3, '[{"position": 1, "meaning": "学习状态"}, {"position": 2, "meaning": "需要加强的方面"}, {"position": 3, "meaning": "考试运势"}]', 'theme', 'study', 7),
('个人成长', '探索内在潜力与灵性发展', 3, '[{"position": 1, "meaning": "当前状态"}, {"position": 2, "meaning": "成长方向"}, {"position": 3, "meaning": "需要突破的限制"}]', 'theme', 'growth', 8),
('身心健康', '了解身心状态与调整建议', 3, '[{"position": 1, "meaning": "身体状态"}, {"position": 2, "meaning": "心理状态"}, {"position": 3, "meaning": "调整建议"}]', 'theme', 'health', 9),
('家庭人际', '分析家庭关系与人际互动', 3, '[{"position": 1, "meaning": "关系现状"}, {"position": 2, "meaning": "问题根源"}, {"position": 3, "meaning": "改善方法"}]', 'theme', 'relationship', 10),
('重大决策', '协助重要选择与人生方向', 3, '[{"position": 1, "meaning": "选择A的结果"}, {"position": 2, "meaning": "选择B的结果"}, {"position": 3, "meaning": "核心建议"}]', 'theme', 'decision', 11);
