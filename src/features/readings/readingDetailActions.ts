import type { UUID } from '../../domain/types';

import type { ReadingDetail, ReadingRepository } from './readingRepository';
import { reversalStateLabel } from '../draw/reversalPresentation';

export function buildReadingShareText(detail: ReadingDetail): string {
  const dateTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: detail.reading.reading_timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(detail.reading.reading_at));
  const cards = detail.cards.length
    ? detail.cards
        .map(({ reading_card: card, tarot_card: tarotCard }) => {
          const position = card.position_name ? `${card.position_name}：` : '';
          const name = tarotCard?.name_zh ?? '未选择牌面';
          const orientation = reversalStateLabel(card.orientation, card.reversalVariant);

          const interpretation = card.interpretation ? `\n   单牌解读：${card.interpretation}` : '';
          return `${card.position_order}. ${position}${name} · ${orientation}${interpretation}`;
        })
        .join('\n')
    : '尚未录入牌面。';

  return [
    detail.topic.title,
    `问题：${detail.question_text}`,
    `记录时间：${dateTime}`,
    `状态：${detail.reading.status === 'draft' ? '草稿' : '正式记录'}`,
    '牌面：',
    cards,
    `总体解读：${detail.reading.interpretation ?? '尚未填写'}`,
  ].join('\n');
}

export async function deleteReadingAfterConfirmation(
  repository: ReadingRepository,
  readingId: UUID,
  confirmed: boolean,
): Promise<boolean> {
  if (!confirmed) {
    return false;
  }

  await repository.deleteReading(readingId);

  return true;
}
