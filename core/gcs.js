import { createDefaultCharacter, deepClone, uid } from './state.js';

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeTrait(trait = {}) {
  return {
    id: trait.id ?? uid('trait'),
    name: trait.name ?? trait.description ?? 'Novo traço',
    type: trait.type ?? (number(trait.points, 0) < 0 ? 'disadvantage' : 'advantage'),
    cost: Math.abs(number(trait.cost ?? trait.points, 0)),
    level: Math.max(1, number(trait.level, 1)),
    notes: trait.notes ?? '',
    modifiers: ensureArray(trait.modifiers).map((modifier) => ({
      id: modifier.id ?? uid('mod'),
      target: modifier.target ?? '',
      amount: number(modifier.amount, 0)
    }))
  };
}

function normalizeSkill(skill = {}) {
  return {
    id: skill.id ?? uid('skill'),
    name: skill.name ?? 'Nova perícia',
    attribute: skill.attribute ?? skill.attr ?? 'IQ',
    difficulty: String(skill.difficulty ?? skill.diff ?? 'A').toUpperCase(),
    points: number(skill.points, 0),
    bonus: number(skill.bonus, 0),
    notes: skill.notes ?? ''
  };
}

function normalizeSpell(spell = {}) {
  return {
    id: spell.id ?? uid('spell'),
    name: spell.name ?? 'Nova magia',
    college: spell.college ?? '',
    attribute: spell.attribute ?? spell.attr ?? 'IQ',
    difficulty: String(spell.difficulty ?? spell.diff ?? 'H').toUpperCase(),
    points: number(spell.points, 0),
    bonus: number(spell.bonus, 0),
    notes: spell.notes ?? ''
  };
}

function normalizeEquipment(item = {}) {
  return {
    id: item.id ?? uid('item'),
    name: item.name ?? 'Novo item',
    qty: Math.max(0, number(item.qty, 1)),
    weight: number(item.weight, 0),
    cost: number(item.cost, 0),
    carried: item.carried !== false,
    notes: item.notes ?? ''
  };
}

function mapAttributes(source = {}) {
  if (Array.isArray(source)) {
    const picked = {};
    for (const attribute of source) {
      const key = String(attribute.id ?? attribute.attr_id ?? attribute.name ?? '').toLowerCase();
      const value = number(attribute.value ?? attribute.score, undefined);
      if (!Number.isFinite(value)) continue;
      if (['st', 'dx', 'iq', 'ht', 'hp', 'fp', 'will', 'per', 'speed', 'move'].includes(key)) {
        picked[key] = value;
      }
    }
    return picked;
  }

  return {
    st: number(source.st, 10),
    dx: number(source.dx, 10),
    iq: number(source.iq, 10),
    ht: number(source.ht, 10),
    hp: number(source.hp, number(source.st, 10)),
    fp: number(source.fp, number(source.ht, 10)),
    will: number(source.will, number(source.iq, 10)),
    per: number(source.per, number(source.iq, 10)),
    speed: number(source.speed, 5),
    move: number(source.move, 5)
  };
}

export function normalizeCharacter(input) {
  const base = createDefaultCharacter();
  const payload = input.character ? input.character : input;

  const normalized = deepClone(base);
  normalized.meta = {
    ...normalized.meta,
    name: payload.meta?.name ?? payload.name ?? payload.profile?.name ?? normalized.meta.name,
    player: payload.meta?.player ?? payload.player ?? '',
    campaign: payload.meta?.campaign ?? payload.campaign ?? '',
    notes: payload.meta?.notes ?? payload.notes ?? '',
    techLevel: String(payload.meta?.techLevel ?? payload.techLevel ?? '3')
  };

  normalized.points = {
    budget: number(payload.points?.budget ?? payload.budget, base.points.budget),
    unspent: number(payload.points?.unspent, 0)
  };

  normalized.attributes = {
    ...normalized.attributes,
    ...mapAttributes(payload.attributes ?? payload.stats ?? {})
  };
  normalized.resources = {
    hpCurrent: number(payload.resources?.hpCurrent, normalized.attributes.hp),
    fpCurrent: number(payload.resources?.fpCurrent, normalized.attributes.fp)
  };
  normalized.traits = ensureArray(payload.traits ?? payload.advantages ?? []).map(normalizeTrait);
  normalized.skills = ensureArray(payload.skills).map(normalizeSkill);
  normalized.spells = ensureArray(payload.spells).map(normalizeSpell);
  normalized.equipment = ensureArray(payload.equipment ?? payload.items).map(normalizeEquipment);

  return normalized;
}

export function serializeCharacter(character) {
  return JSON.stringify({
    type: 'SingularV3Character',
    exportedAt: new Date().toISOString(),
    character
  }, null, 2);
}

export async function readCharacterFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('O arquivo .gcs precisa estar em JSON para esta versão standalone.');
  }
  return normalizeCharacter(parsed);
}

export function downloadGCS(character) {
  const blob = new Blob([serializeCharacter(character)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(character.meta?.name || 'personagem').replace(/[^\w.-]+/g, '_')}.gcs`;
  anchor.click();
  URL.revokeObjectURL(url);
}
