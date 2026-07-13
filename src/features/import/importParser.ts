import { tarotCards } from '../../domain/tarotCards';

export type ImportWarning = { code: string; message: string; field?: string };
export type ImportCardCandidate = {
  tarotCardId: number | null;
  rawCardName: string;
  orientation: 'upright' | 'reversed' | null;
  reversalExpression: 'underexpressed' | 'overexpressed' | null;
  warnings: ImportWarning[];
};
export type ImportReadingCandidate = {
  importId: string;
  sourceOrder: number;
  date: string | null;
  topicText: string | null;
  question: string;
  cards: ImportCardCandidate[];
  notes: string | null;
  warnings: ImportWarning[];
  isValid: boolean;
  excluded: boolean;
};
export type ImportParseResult = {
  readings: ImportReadingCandidate[];
  globalWarnings: ImportWarning[];
};
const required = ['Date', 'Topic', 'Question', 'Cards'];
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`));
export function parseImportText(input: string): ImportParseResult {
  const text = input.replace(/\r\n/g, '\n').trim();
  if (!text)
    return {
      readings: [],
      globalWarnings: [{ code: 'empty_input', message: '没有可解析的内容。' }],
    };
  const blocks = text.split(/^\s*\[Reading\]\s*$/m).slice(1);
  if (!blocks.length)
    return {
      readings: [],
      globalWarnings: [{ code: 'format', message: '内容必须以 [Reading] 区块组织。' }],
    };
  return {
    globalWarnings: [],
    readings: blocks.map((block, index) => parseBlock(block, index + 1)),
  };
}
function parseBlock(block: string, order: number): ImportReadingCandidate {
  const warnings: ImportWarning[] = [];
  const fields = new Map<string, string[]>();
  let current: string | null = null;
  block.split('\n').forEach((raw) => {
    const line = raw.trimEnd();
    const match = /^(Date|Topic|Question|Cards|Notes):\s*(.*)$/.exec(line);
    if (match) {
      current = match[1]!;
      const values = fields.get(current) ?? [];
      values.push(match[2]!);
      fields.set(current, values);
    } else if (current && (current === 'Notes' || current === 'Cards'))
      fields.set(current, [...(fields.get(current) ?? []), line]);
    else if (line.trim()) warnings.push({ code: 'unexpected_line', message: `无法识别：${line}` });
  });
  required.forEach((name) => {
    if (!fields.has(name))
      warnings.push({ code: 'missing_field', message: `缺少 ${name}。`, field: name });
    if ((fields.get(name)?.length ?? 0) > 1)
      warnings.push({ code: 'duplicate_field', message: `${name} 重复。`, field: name });
  });
  const dateRaw = fields.get('Date')?.[0]?.trim() ?? '';
  if (dateRaw && !validDate(dateRaw))
    warnings.push({ code: 'invalid_date', message: '日期必须为 YYYY-MM-DD。', field: 'Date' });
  const question = fields.get('Question')?.[0]?.trim() ?? '';
  if (!question)
    warnings.push({ code: 'missing_question', message: '问题不能为空。', field: 'Question' });
  const cards = (fields.get('Cards') ?? []).filter((line) => line.trim()).map(parseCard);
  if (!cards.length)
    warnings.push({ code: 'missing_cards', message: '至少需要一张牌。', field: 'Cards' });
  if (cards.some((card) => card.tarotCardId === null || card.orientation === null))
    warnings.push({ code: 'invalid_cards', message: '存在未解决的牌面错误。', field: 'Cards' });
  return {
    importId: `import-${order}`,
    sourceOrder: order,
    date: dateRaw || null,
    topicText: fields.get('Topic')?.[0]?.trim() || null,
    question,
    cards,
    notes: fields.has('Notes') ? (fields.get('Notes') ?? []).join('\n').trim() || null : null,
    warnings,
    isValid: warnings.length === 0,
    excluded: false,
  };
}
function parseCard(line: string): ImportCardCandidate {
  const warnings: ImportWarning[] = [];
  const match =
    /^\s*-\s*([^|]+?)\s*\|\s*(upright|reversed)(?:\s*\|\s*(underexpressed|overexpressed))?\s*$/.exec(
      line,
    );
  if (!match)
    return {
      tarotCardId: null,
      rawCardName: line.trim(),
      orientation: null,
      reversalExpression: null,
      warnings: [{ code: 'malformed_card', message: `牌面格式无效：${line}` }],
    };
  const card = tarotCards.find((item) => item.name_zh === match[1]!.trim());
  const orientation = match[2] as 'upright' | 'reversed';
  const expression = (match[3] ?? null) as ImportCardCandidate['reversalExpression'];
  if (!card) warnings.push({ code: 'unknown_card', message: `无法识别牌名：${match[1]!.trim()}` });
  if (orientation === 'upright' && expression)
    warnings.push({ code: 'upright_expression', message: '正位不能带逆位表达。' });
  return {
    tarotCardId: card?.id ?? null,
    rawCardName: match[1]!.trim(),
    orientation,
    reversalExpression: expression,
    warnings,
  };
}

export const IMPORT_AI_PROMPT = `请把下面的塔罗记录整理为严格格式。\n\n不要解释。\n不要分析。\n不要总结。\n不要分类。\n不要补充缺失信息。\n不要遗漏任何一次抽牌。\n不要改变问题原意。\n保持原始顺序。\n\n每条记录必须输出为：\n[Reading]\nDate: YYYY-MM-DD\nTopic:\nQuestion:\nCards:\n- 牌名 | upright\n- 牌名 | reversed\nNotes:\n\n规则：没有日期、Topic 或 Notes 时留空；牌名使用标准中文塔罗牌名；只有原文明确写出表达不足/过度时才使用 underexpressed/overexpressed；只输出整理结果。\n\n示例：\n[Reading]\nDate: 2026-07-13\nTopic: 关系\nQuestion: 她现在想对我说什么？\nCards:\n- 星币国王 | upright\nNotes:`;
