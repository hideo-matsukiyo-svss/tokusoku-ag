// 通知先の設定。ここを変えれば、誰に・どこへ知らせるかが変わります。
// ★実際のSlack送信は Step7 でつなぎます。今は「印」を付けるだけ。

export const REVIEW_NOTIFY = {
  // 🟡要確認 の連絡先（バックオフィス担当）
  slackChannelId: 'C05HTTJ5JJH',    // svssltd.slack.com のチャンネルID
  slackChannelLabel: '#バックオフィス',
  mentions: ['松清', '白井'],        // メンションする人
};
