// ★ここが督促AGの「心臓」= 督促ラダー（いつ・どんなトーンで押すか）。
// エンジニアではなく、経理を分かっている人（＝Hideoさん）が数字とトーンを決める場所です。
// 会話で作ったタタキ台をそのままコードにしてあります。ここの数字を書き換えれば挙動が変わります。

import type { LadderStage } from './types.js';

export type LadderRule = {
  stage: LadderStage;
  label: string;           // 段階の呼び名
  fromLabel: string;       // 差出人
  needsApproval: boolean;  // 人の承認を挟むか（HITL）
  tone: string;            // AIに文面調整させるときのトーン指示
};

// 期日を起点にした「何日で発火するか」の閾値。
export const LADDER_THRESHOLDS = {
  preReminderDaysBefore: 3, // 期日の3営業日前に予告リマインド
  firstAfterDays: 3,        // 超過+3営業日で1回目
  secondAfterDays: 10,      // 超過+10日で2回目
  finalAfterDays: 20,       // 超過+20日で最終
};

// 各段階のトーン・差出人・承認要否。
export const LADDER_RULES: Record<LadderStage, LadderRule> = {
  pre: {
    stage: 'pre',
    label: '予告リマインド',
    fromLabel: 'SVSS経理',
    needsApproval: false, // 期日前の優しい予告は自動送信でOK
    tone: 'やわらかく、恐縮しながら期日をそっと思い出させる。督促感を出さない。',
  },
  first: {
    stage: 'first',
    label: '1回目督促',
    fromLabel: 'SVSS経理',
    needsApproval: false, // 行き違い前提の柔らかい確認は自動でOK
    tone: '「行き違いでしたら申し訳ありません」の姿勢。責めずに確認をお願いする。',
  },
  second: {
    stage: 'second',
    label: '2回目督促',
    fromLabel: 'SVSS経理',
    needsApproval: true,  // 2回目からは代表が中身を確認してから
    tone: '丁寧だが事実を明確に。入金期日を改めて明示し、確認を依頼する。',
  },
  final: {
    stage: 'final',
    label: '最終督促',
    fromLabel: 'SVSS代表',
    needsApproval: true,  // 最終は必ず代表承認
    tone: '毅然と、しかし関係を壊さない。代表名で、今後の対応にも触れる。',
  },
};
