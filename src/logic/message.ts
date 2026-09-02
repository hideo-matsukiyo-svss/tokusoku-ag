// ★Step4 の肝：連絡文面づくり。ここはHideoさんの"文面の勘"が効く場所。
// 3種類：初回／リマインド／経理指示反映。事実（対象月・宛名）は変えず、言い回しを固定テンプレで。
// 文面を直したいときは、まずこのファイルを直せばOK（AIは使いません）。

import type { Worker } from './types.js';

export type MessageStage = '初回' | 'リマインド' | '経理指示反映';

export type OutMessage = {
  channel: 'email';
  to: string;
  toName: string;
  subject: string;
  body: string;
  stage: MessageStage;
};

/** "2026-08" → "2026年8月" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${Number(m)}月`;
}

export function buildMessage(
  worker: Worker,
  targetMonth: string,
  stage: MessageStage,
  opts?: { instruction?: string },
): OutMessage {
  const m = formatMonth(targetMonth);
  const head = `${worker.name} 様\n\nいつも大変お世話になっております。SVSS経理でございます。`;
  const foot = `\n\nお手数をおかけしますが、何卒よろしくお願い申し上げます。\n──────────\nSVSS株式会社 経理\n──────────`;

  let subject = '';
  let main = '';

  switch (stage) {
    case '初回':
      subject = `【ご確認のお願い】${m}分 ご請求書のご送付について`;
      main =
        `\n\n${m}分のご稼働につきまして、ご請求書のご送付をお願いしております。` +
        `\n本日中にご送付いただけそうか、ご確認いただけますでしょうか。` +
        `\nなお、ご請求書の作成が難しい場合は、当社にて作成を代行することも可能です。代行をご希望の際は、その旨ご返信ください。`;
      break;

    case 'リマインド':
      subject = `【再度のご連絡】${m}分 ご請求書のご送付について`;
      main =
        `\n\n${m}分のご請求書につきまして、本日時点でご送付の確認が取れておりませんでした。行き違いでのご送付でしたら申し訳ございません。` +
        `\nご多忙のところ恐れ入りますが、ご送付状況をご確認いただけますでしょうか。作成代行が必要な場合は、お気軽にお申し付けください。`;
      break;

    case '経理指示反映':
      subject = `【ご連絡】${m}分 ご請求書について`;
      main = `\n\n${m}分のご請求書につきまして、ご連絡いたします。`;
      if (opts?.instruction && opts.instruction.trim() !== '') {
        // 経理担当者からの指示を本文に反映
        main += `\n\n${opts.instruction.trim()}`;
      }
      main += `\n\nご確認のほど、よろしくお願いいたします。`;
      break;
  }

  return {
    channel: 'email',
    to: worker.email,
    toName: worker.name,
    subject,
    body: head + main + foot,
    stage,
  };
}
