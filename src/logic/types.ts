// 請求書フォローAG で扱うデータの「型」定義。
// ★ここが Step1 の肝：督促の対象は「取引先の未入金」ではなく
//   「稼働したのに請求書をまだ出していない業務委託者（＝未提出者）」です。

/** 提出状況 */
export type FollowStatus = '未提出' | '提出済み' | '対象外';

/** 稼働者リスト(Silver層)の1人＝業務委託者 */
export type Worker = {
  id: string;
  name: string;             // 業務委託者名
  email: string;            // 連絡先メール
  workedThisMonth: boolean; // 今月の稼働があったか（＝請求書を出すべき人か）
  excluded: boolean;        // 対象外フラグ（今月は請求不要／既に別処理 等）
  excludedReason?: string;  // 対象外の理由（任意）
  lastContactedAt?: string; // 最終連絡日 "YYYY-MM-DD"（未連絡なら undefined）
};

/**
 * invoice@svss.ltd 受信メール（原本層）から拾える「提出の痕跡」。
 * 今はモック。将来は実際の受信メールから作る。
 */
export type Submission = {
  fromEmail: string;    // 差出人メール
  workerName?: string;  // 差出人名（判明していれば）
  receivedAt: string;   // 受信日 "YYYY-MM-DD"
  subject: string;      // 件名
};

/** 1人ぶんの突合結果 */
export type WorkerFollow = {
  worker: Worker;
  status: FollowStatus;
  matchedSubmission?: Submission; // 「提出済み」と判定した根拠
};

/** 突合の全体結果 */
export type ReconcileResult = {
  pending: WorkerFollow[];   // 未提出（＝これから督促する対象）
  submitted: WorkerFollow[]; // 提出済み
  excluded: WorkerFollow[];  // 対象外
};
