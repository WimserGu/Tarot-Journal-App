begin;

update public.tarot_cards as card
set name_zh = standard_name.name_zh
from (
  values
    ('major_fool', '愚人'),
    ('major_hermit', '隐士'),
    ('wands_ace', '权杖首牌'),
    ('wands_queen', '权杖王后'),
    ('cups_ace', '圣杯首牌'),
    ('cups_queen', '圣杯王后'),
    ('swords_ace', '宝剑首牌'),
    ('swords_queen', '宝剑王后'),
    ('pentacles_ace', '星币首牌'),
    ('pentacles_queen', '星币王后')
) as standard_name(card_key, name_zh)
where card.card_key = standard_name.card_key;

commit;
