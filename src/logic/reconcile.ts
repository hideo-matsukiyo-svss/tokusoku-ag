// ★Step2 の肝：突合（つきあわせ）ロジック＝「未提出者の検知」。
// 図の「稼働リストと突合し未提出者を検知」がこれ。
// AI（LLM）は使いません。ルールで確定＝いつ動かしても同じ答え。
//
// 判定ルール（上から順に）:
//   1) 対象外フラグ が立っている、または 今月未稼働 → 「対象外」
//   2) 提出メールが見つかる（メールアドレス一致 or 氏名一致）→ 「提出済み」
//   3) それ以外 → 「未提出」（＝督促対象）

import type {
  Worker,
  Submission,
  WorkerFollow,
  ReconcileResult,
} from './types.js';

/** 文字列をゆるく比較するための正規化（空白除去・小文字化） */
function norm(s: string | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

/** この稼働者の提出メールを探す。見つかればそのSubmissionを返す。 */
function findSubmission(
  worker: Worker,
  submissions: Submission[],
): Submission | undefined {
  return submissions.find((s) => {
    const emailMatch = norm(s.fromEmail) === norm(worker.email);
    const nameMatch =
      norm(s.workerName) !== '' && norm(s.workerName) === norm(worker.name);
    return emailMatch || nameMatch;
  });
}

/**
 * 稼働者リストと提出メールを突合し、未提出／提出済み／対象外に振り分ける。
 */
export function reconcile(
  workers: Worker[],
  submissions: Submission[],
): ReconcileResult {
  const pending: WorkerFollow[] = [];
  const submitted: WorkerFollow[] = [];
  const excluded: WorkerFollow[] = [];

  for (const worker of workers) {
    // 1) 対象外
    if (worker.excluded || !worker.workedThisMonth) {
      excluded.push({ worker, status: '対象外' });
      continue;
    }

    // 2) 提出済み
    const hit = findSubmission(worker, submissions);
    if (hit) {
      submitted.push({ worker, status: '提出済み', matchedSubmission: hit });
      continue;
    }

    // 3) 未提出（督促対象）
    pending.push({ worker, status: '未提出' });
  }

  return { pending, submitted, excluded };
}
