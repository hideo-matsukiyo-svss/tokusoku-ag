// 督促メールの「素の文面」をテンプレで組み立てる（AI不要）。
// AIを使う場合は、この素の文面をベースにトーンだけ調整させます（tone-agent.ts）。
// 文面を直したいときは、まずここを直せばOK。

import type { Invoice, LadderStage } from './types.js';
import { LADDER_RULES } from './ladder.js';

const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');

export function buildSubject(stage: LadderStage, invoice: Invoice): string {
  const map: Record<LadderStage, string> = {
    pre: `【ご案内】お支払期日のご確認（請求書 ${invoice.invoiceNo}）`,
    first: `【ご確認のお願い】ご入金状況について（請求書 ${invoice.invoiceNo}）`,
    second: `【再度のご連絡】ご入金のご確認（請求書 ${invoice.invoiceNo}）`,
    final: `【重要】お支払いに関するご連絡（請求書 ${invoice.invoiceNo}）`,
  };
  return map[stage];
}

export function buildBody(stage: LadderStage, invoice: Invoice): string {
  const rule = LADDER_RULES[stage];
  const head = `${invoice.partnerName} ご担当者様\n\nいつも大変お世話になっております。${rule.fromLabel}でございます。`;
  const detail = `\n\n▼対象のご請求\n・請求書番号: ${invoice.invoiceNo}\n・御請求額: ${yen(invoice.amount)}\n・お支払期日: ${invoice.dueDate}`;

  let main = '';
  switch (stage) {
    case 'pre':
      main = `\n\n表題のご請求につきまして、お支払期日が近づいてまいりましたのでご案内申し上げます。ご多忙のところ恐れ入りますが、ご確認いただけますと幸いです。`;
      break;
    case 'first':
      main = `\n\n先般お送りした上記ご請求につきまして、本日時点でご入金の確認が取れておりませんでした。行き違いでのご送金でしたら何卒ご容赦ください。お手数ですがご確認いただけますと幸いです。`;
      break;
    case 'second':
      main = `\n\n上記ご請求につきまして、お支払期日を過ぎてもご入金の確認が取れておりません。恐れ入りますが、お支払い状況をご確認のうえ、ご対応いただけますようお願い申し上げます。`;
      break;
    case 'final':
      main = `\n\n上記ご請求につきまして、複数回ご案内を差し上げておりますが、本日時点でご入金を確認できておりません。誠に恐縮ながら、今後のお取引に関わる事項でもございますため、至急お支払い状況をご確認いただき、ご連絡を賜りますようお願い申し上げます。`;
      break;
  }

  const foot = `\n\n何かご不明点や行き違いがございましたら、本メールにご返信ください。\n引き続きどうぞよろしくお願い申し上げます。\n\n──────────\nSVSS株式会社 経理\n──────────`;

  return head + detail + main + foot;
}
