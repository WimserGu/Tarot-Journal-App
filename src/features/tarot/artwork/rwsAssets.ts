import type { ImageSourcePropType } from 'react-native';
import cardBackAsset from '../../../../assets/tarot/rws/back/rws_back.png';
import fallbackFrontAsset from '../../../../assets/tarot/rws/fallback_front.png';
import card0Asset from '../../../../assets/tarot/rws/fronts/major_00_fool.jpg';
import card1Asset from '../../../../assets/tarot/rws/fronts/major_01_magician.jpg';
import card2Asset from '../../../../assets/tarot/rws/fronts/major_02_high_priestess.jpg';
import card3Asset from '../../../../assets/tarot/rws/fronts/major_03_empress.jpg';
import card4Asset from '../../../../assets/tarot/rws/fronts/major_04_emperor.jpg';
import card5Asset from '../../../../assets/tarot/rws/fronts/major_05_hierophant.jpg';
import card6Asset from '../../../../assets/tarot/rws/fronts/major_06_lovers.jpg';
import card7Asset from '../../../../assets/tarot/rws/fronts/major_07_chariot.jpg';
import card8Asset from '../../../../assets/tarot/rws/fronts/major_08_strength.jpg';
import card9Asset from '../../../../assets/tarot/rws/fronts/major_09_hermit.jpg';
import card10Asset from '../../../../assets/tarot/rws/fronts/major_10_wheel_of_fortune.jpg';
import card11Asset from '../../../../assets/tarot/rws/fronts/major_11_justice.jpg';
import card12Asset from '../../../../assets/tarot/rws/fronts/major_12_hanged_man.jpg';
import card13Asset from '../../../../assets/tarot/rws/fronts/major_13_death.jpg';
import card14Asset from '../../../../assets/tarot/rws/fronts/major_14_temperance.jpg';
import card15Asset from '../../../../assets/tarot/rws/fronts/major_15_devil.jpg';
import card16Asset from '../../../../assets/tarot/rws/fronts/major_16_tower.jpg';
import card17Asset from '../../../../assets/tarot/rws/fronts/major_17_star.jpg';
import card18Asset from '../../../../assets/tarot/rws/fronts/major_18_moon.jpg';
import card19Asset from '../../../../assets/tarot/rws/fronts/major_19_sun.jpg';
import card20Asset from '../../../../assets/tarot/rws/fronts/major_20_judgement.jpg';
import card21Asset from '../../../../assets/tarot/rws/fronts/major_21_world.jpg';
import card22Asset from '../../../../assets/tarot/rws/fronts/wands_01_ace.jpg';
import card23Asset from '../../../../assets/tarot/rws/fronts/wands_02_two.jpg';
import card24Asset from '../../../../assets/tarot/rws/fronts/wands_03_three.jpg';
import card25Asset from '../../../../assets/tarot/rws/fronts/wands_04_four.jpg';
import card26Asset from '../../../../assets/tarot/rws/fronts/wands_05_five.jpg';
import card27Asset from '../../../../assets/tarot/rws/fronts/wands_06_six.jpg';
import card28Asset from '../../../../assets/tarot/rws/fronts/wands_07_seven.jpg';
import card29Asset from '../../../../assets/tarot/rws/fronts/wands_08_eight.jpg';
import card30Asset from '../../../../assets/tarot/rws/fronts/wands_09_nine.jpg';
import card31Asset from '../../../../assets/tarot/rws/fronts/wands_10_ten.jpg';
import card32Asset from '../../../../assets/tarot/rws/fronts/wands_11_page.jpg';
import card33Asset from '../../../../assets/tarot/rws/fronts/wands_12_knight.jpg';
import card34Asset from '../../../../assets/tarot/rws/fronts/wands_13_queen.jpg';
import card35Asset from '../../../../assets/tarot/rws/fronts/wands_14_king.jpg';
import card36Asset from '../../../../assets/tarot/rws/fronts/cups_01_ace.jpg';
import card37Asset from '../../../../assets/tarot/rws/fronts/cups_02_two.jpg';
import card38Asset from '../../../../assets/tarot/rws/fronts/cups_03_three.jpg';
import card39Asset from '../../../../assets/tarot/rws/fronts/cups_04_four.jpg';
import card40Asset from '../../../../assets/tarot/rws/fronts/cups_05_five.jpg';
import card41Asset from '../../../../assets/tarot/rws/fronts/cups_06_six.jpg';
import card42Asset from '../../../../assets/tarot/rws/fronts/cups_07_seven.jpg';
import card43Asset from '../../../../assets/tarot/rws/fronts/cups_08_eight.jpg';
import card44Asset from '../../../../assets/tarot/rws/fronts/cups_09_nine.jpg';
import card45Asset from '../../../../assets/tarot/rws/fronts/cups_10_ten.jpg';
import card46Asset from '../../../../assets/tarot/rws/fronts/cups_11_page.jpg';
import card47Asset from '../../../../assets/tarot/rws/fronts/cups_12_knight.jpg';
import card48Asset from '../../../../assets/tarot/rws/fronts/cups_13_queen.jpg';
import card49Asset from '../../../../assets/tarot/rws/fronts/cups_14_king.jpg';
import card50Asset from '../../../../assets/tarot/rws/fronts/swords_01_ace.jpg';
import card51Asset from '../../../../assets/tarot/rws/fronts/swords_02_two.jpg';
import card52Asset from '../../../../assets/tarot/rws/fronts/swords_03_three.jpg';
import card53Asset from '../../../../assets/tarot/rws/fronts/swords_04_four.jpg';
import card54Asset from '../../../../assets/tarot/rws/fronts/swords_05_five.jpg';
import card55Asset from '../../../../assets/tarot/rws/fronts/swords_06_six.jpg';
import card56Asset from '../../../../assets/tarot/rws/fronts/swords_07_seven.jpg';
import card57Asset from '../../../../assets/tarot/rws/fronts/swords_08_eight.jpg';
import card58Asset from '../../../../assets/tarot/rws/fronts/swords_09_nine.jpg';
import card59Asset from '../../../../assets/tarot/rws/fronts/swords_10_ten.jpg';
import card60Asset from '../../../../assets/tarot/rws/fronts/swords_11_page.jpg';
import card61Asset from '../../../../assets/tarot/rws/fronts/swords_12_knight.jpg';
import card62Asset from '../../../../assets/tarot/rws/fronts/swords_13_queen.jpg';
import card63Asset from '../../../../assets/tarot/rws/fronts/swords_14_king.jpg';
import card64Asset from '../../../../assets/tarot/rws/fronts/pentacles_01_ace.jpg';
import card65Asset from '../../../../assets/tarot/rws/fronts/pentacles_02_two.jpg';
import card66Asset from '../../../../assets/tarot/rws/fronts/pentacles_03_three.jpg';
import card67Asset from '../../../../assets/tarot/rws/fronts/pentacles_04_four.jpg';
import card68Asset from '../../../../assets/tarot/rws/fronts/pentacles_05_five.jpg';
import card69Asset from '../../../../assets/tarot/rws/fronts/pentacles_06_six.jpg';
import card70Asset from '../../../../assets/tarot/rws/fronts/pentacles_07_seven.jpg';
import card71Asset from '../../../../assets/tarot/rws/fronts/pentacles_08_eight.jpg';
import card72Asset from '../../../../assets/tarot/rws/fronts/pentacles_09_nine.jpg';
import card73Asset from '../../../../assets/tarot/rws/fronts/pentacles_10_ten.jpg';
import card74Asset from '../../../../assets/tarot/rws/fronts/pentacles_11_page.jpg';
import card75Asset from '../../../../assets/tarot/rws/fronts/pentacles_12_knight.jpg';
import card76Asset from '../../../../assets/tarot/rws/fronts/pentacles_13_queen.jpg';
import card77Asset from '../../../../assets/tarot/rws/fronts/pentacles_14_king.jpg';

export const RWS_CARD_BACK_ASSET = cardBackAsset as ImageSourcePropType;
export const RWS_FALLBACK_FRONT_ASSET = fallbackFrontAsset as ImageSourcePropType;

export const RWS_FRONT_ASSETS = Object.freeze({
  0: card0Asset as ImageSourcePropType,
  1: card1Asset as ImageSourcePropType,
  2: card2Asset as ImageSourcePropType,
  3: card3Asset as ImageSourcePropType,
  4: card4Asset as ImageSourcePropType,
  5: card5Asset as ImageSourcePropType,
  6: card6Asset as ImageSourcePropType,
  7: card7Asset as ImageSourcePropType,
  8: card8Asset as ImageSourcePropType,
  9: card9Asset as ImageSourcePropType,
  10: card10Asset as ImageSourcePropType,
  11: card11Asset as ImageSourcePropType,
  12: card12Asset as ImageSourcePropType,
  13: card13Asset as ImageSourcePropType,
  14: card14Asset as ImageSourcePropType,
  15: card15Asset as ImageSourcePropType,
  16: card16Asset as ImageSourcePropType,
  17: card17Asset as ImageSourcePropType,
  18: card18Asset as ImageSourcePropType,
  19: card19Asset as ImageSourcePropType,
  20: card20Asset as ImageSourcePropType,
  21: card21Asset as ImageSourcePropType,
  22: card22Asset as ImageSourcePropType,
  23: card23Asset as ImageSourcePropType,
  24: card24Asset as ImageSourcePropType,
  25: card25Asset as ImageSourcePropType,
  26: card26Asset as ImageSourcePropType,
  27: card27Asset as ImageSourcePropType,
  28: card28Asset as ImageSourcePropType,
  29: card29Asset as ImageSourcePropType,
  30: card30Asset as ImageSourcePropType,
  31: card31Asset as ImageSourcePropType,
  32: card32Asset as ImageSourcePropType,
  33: card33Asset as ImageSourcePropType,
  34: card34Asset as ImageSourcePropType,
  35: card35Asset as ImageSourcePropType,
  36: card36Asset as ImageSourcePropType,
  37: card37Asset as ImageSourcePropType,
  38: card38Asset as ImageSourcePropType,
  39: card39Asset as ImageSourcePropType,
  40: card40Asset as ImageSourcePropType,
  41: card41Asset as ImageSourcePropType,
  42: card42Asset as ImageSourcePropType,
  43: card43Asset as ImageSourcePropType,
  44: card44Asset as ImageSourcePropType,
  45: card45Asset as ImageSourcePropType,
  46: card46Asset as ImageSourcePropType,
  47: card47Asset as ImageSourcePropType,
  48: card48Asset as ImageSourcePropType,
  49: card49Asset as ImageSourcePropType,
  50: card50Asset as ImageSourcePropType,
  51: card51Asset as ImageSourcePropType,
  52: card52Asset as ImageSourcePropType,
  53: card53Asset as ImageSourcePropType,
  54: card54Asset as ImageSourcePropType,
  55: card55Asset as ImageSourcePropType,
  56: card56Asset as ImageSourcePropType,
  57: card57Asset as ImageSourcePropType,
  58: card58Asset as ImageSourcePropType,
  59: card59Asset as ImageSourcePropType,
  60: card60Asset as ImageSourcePropType,
  61: card61Asset as ImageSourcePropType,
  62: card62Asset as ImageSourcePropType,
  63: card63Asset as ImageSourcePropType,
  64: card64Asset as ImageSourcePropType,
  65: card65Asset as ImageSourcePropType,
  66: card66Asset as ImageSourcePropType,
  67: card67Asset as ImageSourcePropType,
  68: card68Asset as ImageSourcePropType,
  69: card69Asset as ImageSourcePropType,
  70: card70Asset as ImageSourcePropType,
  71: card71Asset as ImageSourcePropType,
  72: card72Asset as ImageSourcePropType,
  73: card73Asset as ImageSourcePropType,
  74: card74Asset as ImageSourcePropType,
  75: card75Asset as ImageSourcePropType,
  76: card76Asset as ImageSourcePropType,
  77: card77Asset as ImageSourcePropType,
}) as Readonly<Record<number, ImageSourcePropType>>;

export const RWS_FRONT_FILENAMES = Object.freeze({
  0: 'major_00_fool.jpg',
  1: 'major_01_magician.jpg',
  2: 'major_02_high_priestess.jpg',
  3: 'major_03_empress.jpg',
  4: 'major_04_emperor.jpg',
  5: 'major_05_hierophant.jpg',
  6: 'major_06_lovers.jpg',
  7: 'major_07_chariot.jpg',
  8: 'major_08_strength.jpg',
  9: 'major_09_hermit.jpg',
  10: 'major_10_wheel_of_fortune.jpg',
  11: 'major_11_justice.jpg',
  12: 'major_12_hanged_man.jpg',
  13: 'major_13_death.jpg',
  14: 'major_14_temperance.jpg',
  15: 'major_15_devil.jpg',
  16: 'major_16_tower.jpg',
  17: 'major_17_star.jpg',
  18: 'major_18_moon.jpg',
  19: 'major_19_sun.jpg',
  20: 'major_20_judgement.jpg',
  21: 'major_21_world.jpg',
  22: 'wands_01_ace.jpg',
  23: 'wands_02_two.jpg',
  24: 'wands_03_three.jpg',
  25: 'wands_04_four.jpg',
  26: 'wands_05_five.jpg',
  27: 'wands_06_six.jpg',
  28: 'wands_07_seven.jpg',
  29: 'wands_08_eight.jpg',
  30: 'wands_09_nine.jpg',
  31: 'wands_10_ten.jpg',
  32: 'wands_11_page.jpg',
  33: 'wands_12_knight.jpg',
  34: 'wands_13_queen.jpg',
  35: 'wands_14_king.jpg',
  36: 'cups_01_ace.jpg',
  37: 'cups_02_two.jpg',
  38: 'cups_03_three.jpg',
  39: 'cups_04_four.jpg',
  40: 'cups_05_five.jpg',
  41: 'cups_06_six.jpg',
  42: 'cups_07_seven.jpg',
  43: 'cups_08_eight.jpg',
  44: 'cups_09_nine.jpg',
  45: 'cups_10_ten.jpg',
  46: 'cups_11_page.jpg',
  47: 'cups_12_knight.jpg',
  48: 'cups_13_queen.jpg',
  49: 'cups_14_king.jpg',
  50: 'swords_01_ace.jpg',
  51: 'swords_02_two.jpg',
  52: 'swords_03_three.jpg',
  53: 'swords_04_four.jpg',
  54: 'swords_05_five.jpg',
  55: 'swords_06_six.jpg',
  56: 'swords_07_seven.jpg',
  57: 'swords_08_eight.jpg',
  58: 'swords_09_nine.jpg',
  59: 'swords_10_ten.jpg',
  60: 'swords_11_page.jpg',
  61: 'swords_12_knight.jpg',
  62: 'swords_13_queen.jpg',
  63: 'swords_14_king.jpg',
  64: 'pentacles_01_ace.jpg',
  65: 'pentacles_02_two.jpg',
  66: 'pentacles_03_three.jpg',
  67: 'pentacles_04_four.jpg',
  68: 'pentacles_05_five.jpg',
  69: 'pentacles_06_six.jpg',
  70: 'pentacles_07_seven.jpg',
  71: 'pentacles_08_eight.jpg',
  72: 'pentacles_09_nine.jpg',
  73: 'pentacles_10_ten.jpg',
  74: 'pentacles_11_page.jpg',
  75: 'pentacles_12_knight.jpg',
  76: 'pentacles_13_queen.jpg',
  77: 'pentacles_14_king.jpg',
}) as Readonly<Record<number, string>>;
