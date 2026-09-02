// 督促AGで扱うデータの「型」定義。
// ここを見れば「このAGが何を入力に、何を出すか」が一目で分かるようにしてあります。

/** 1件の請求書（MFから取得する想定のデータ） */
export type Invoice = {
  invoiceNo: string;        // 請求書番号
  partnerName: string;      // 取引先名
  partnerEmail: string;     // 送付先メール
  amount: number;           // 請求金額（円）
  dueDate: string;          // 支払期日 "YYYY-MM-DD"
  paid: boolean;            // 入金済みか
  // 過去の支払い履歴（セグメント判定に使う）
  history: {
    pastInvoices: number;   // 過去の取引件数
    lateCount: number;      // うち遅延した回数
  };
};

/** 督促の段階 */
export type LadderStage = 'pre' | 'first' | 'second' | 'final';

/** AGが出す督促ドラフト1件 */
export type DunningDraft = {
  invoiceNo: string;
  partnerName: string;
  partnerEmail: string;
  amount: number;
  dueDate: string;
  overdueDays: number;      // 期日超過日数（マイナス=まだ期日前）
  segment: string;          // 顧客セグメント（優良/通常/要注意）
  stage: LadderStage;       // どの督促段階か
  fromLabel: string;        // 差出人（経理担当 / 代表）
  needsApproval: boolean;   // 人の承認が必要か（HITL）
  subject: string;          // メール件名
  body: string;             // メール本文
};
