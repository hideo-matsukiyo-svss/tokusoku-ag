// ★突合（つきあわせ）ロジック＝「未提出者の検知」＋「4分類」。
// 図の「稼働リストと突合し未提出者を検知」がこれ。AIは使わない＝ルールで確定。
//
// 提出判定は4条件（すべて満たせば「提出済み」）:
//   ① 差出人が稼働者リストと一致
//   ② 件名が請求書らしい
//   ③ PDF添付あり
//   ④ 対象月（前月分）と一致
// 判定が曖昧（複数通・複数月分・PDFなし・件名不一致 など）は自動確定せず「要確認」。

import type {
  Worker,
  Submission,
  WorkerFollow,
  ReconcileResult,
} from './types.js';

/** 文字列をゆるく比較するための正規化 */
function norm(s: string | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

/** "YYYY-MM-DD" の前月を "YYYY-MM" で返す（＝今回追いかける対象月） */
export function targetMonthOf(today: string): string {
  const d = new Date(today + 'T00:00:00');
  d.setDate(1);
  d.setMonth(d.getMonth() - 1); // 前月へ
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 件名が「請求書」らしいか */
function subjectLooksInvoice(subject: string): boolean {
  const s = subject.toLowerCase();
  return s.includes('請求') || s.includes('invoice');
}

/** この稼働者から届いたメール（候補）を全部拾う */
function candidatesFor(worker: Worker, submissions: Submission[]): Submission[] {
  return submissions.filter((s) => {
    const emailMatch = norm(s.fromEmail) === norm(worker.email);
    const nameMatch =
      norm(s.workerName) !== '' && norm(s.workerName) === norm(worker.name);
    return emailMatch || nameMatch;
  });
}

/**
 * 稼働者リストと提出メールを突合し、未提出／提出済み／対象外／要確認 に振り分ける。
 */
export function reconcile(
  workers: Worker[],
  submissions: Submission[],
  today: string,
): ReconcileResult {
  const month = targetMonthOf(today);

  const pending: WorkerFollow[] = [];
  const submitted: WorkerFollow[] = [];
  const excluded: WorkerFollow[] = [];
  const needsReview: WorkerFollow[] = [];

  for (const worker of workers) {
    // 対象外（今月未稼働 or 対象外フラグ）
    if (worker.excluded || !worker.workedThisMonth) {
      excluded.push({ worker, status: '対象外' });
      continue;
    }

    const candidates = candidatesFor(worker, submissions);

    // 候補メールが1通も無い → 未提出
    if (candidates.length === 0) {
      pending.push({ worker, status: '未提出' });
      continue;
    }

    // 4条件を全部満たす候補
    const valid = candidates.filter(
      (s) =>
        subjectLooksInvoice(s.subject) && s.hasPdf && s.targetMonth === month,
    );

    // ちょうど1通だけ来ていて、それが4条件を満たす → 提出済み
    if (candidates.length === 1 && valid.length === 1) {
      submitted.push({
        worker,
        status: '提出済み',
        matchedSubmission: valid[0],
      });
      continue;
    }

    // それ以外は「要確認」。理由を集めて人へ。
    const reasons: string[] = [];
    if (candidates.length > 1) reasons.push('請求書メールが複数通ある（複数月分の可能性）');
    if (candidates.some((s) => !s.hasPdf)) reasons.push('PDF添付が無いメールがある');
    if (candidates.some((s) => !subjectLooksInvoice(s.subject)))
      reasons.push('件名から請求書と判断できないメールがある');
    if (!candidates.some((s) => s.targetMonth === month))
      reasons.push(`対象月(${month})分の請求が見当たらない`);
    if (reasons.length === 0) reasons.push('自動で提出済みと確定できなかった');

    needsReview.push({
      worker,
      status: '要確認',
      candidates,
      reviewReasons: reasons,
    });
  }

  return { pending, submitted, excluded, needsReview };
}
