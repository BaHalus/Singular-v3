const ATTRIBUTE_COSTS = { st: 10, dx: 20, iq: 20, ht: 10 };
const DIFFICULTY_OFFSETS = { E: 0, A: -1, H: -2, VH: -3 };

const round2 = (value) => Math.round(value * 100) / 100;
const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function collectBonuses(character) {
  const bonuses = {};
  for (const trait of character.traits ?? []) {
    for (const modifier of trait.modifiers ?? []) {
      const key = (modifier.target || '').trim();
      if (!key) continue;
      bonuses[key] = (bonuses[key] ?? 0) + num(modifier.amount, 0);
    }
  }
  return bonuses;
}

export function getBonus(bonuses, key) {
  return num(bonuses[key], 0);
}

export function calculateDerived(character) {
  const attributes = character.attributes ?? {};
  const bonuses = collectBonuses(character);

  const effective = {
    st: num(attributes.st, 10) + getBonus(bonuses, 'attribute.st'),
    dx: num(attributes.dx, 10) + getBonus(bonuses, 'attribute.dx'),
    iq: num(attributes.iq, 10) + getBonus(bonuses, 'attribute.iq'),
    ht: num(attributes.ht, 10) + getBonus(bonuses, 'attribute.ht')
  };

  effective.hp = num(attributes.hp, effective.st) + getBonus(bonuses, 'attribute.hp');
  effective.fp = num(attributes.fp, effective.ht) + getBonus(bonuses, 'attribute.fp');
  effective.will = num(attributes.will, effective.iq) + getBonus(bonuses, 'attribute.will');
  effective.per = num(attributes.per, effective.iq) + getBonus(bonuses, 'attribute.per');
  effective.speed = round2(num(attributes.speed, (effective.dx + effective.ht) / 4) + getBonus(bonuses, 'attribute.speed'));
  effective.move = num(attributes.move, Math.floor(effective.speed)) + getBonus(bonuses, 'attribute.move');

  const points = calculatePointBreakdown(character, effective);
  const encumbrance = calculateEncumbrance(character, effective.st);

  return { bonuses, effective, points, encumbrance };
}

export function calculatePointBreakdown(character, effective) {
  const base = character.attributes ?? {};
  const primary = Object.entries(ATTRIBUTE_COSTS).reduce(
    (total, [key, cost]) => total + (num(base[key], 10) - 10) * cost,
    0
  );
  const secondary =
    (num(base.hp, num(base.st, 10)) - num(base.st, 10)) * 3 +
    (num(base.fp, num(base.ht, 10)) - num(base.ht, 10)) * 3 +
    (num(base.will, num(base.iq, 10)) - num(base.iq, 10)) * 5 +
    (num(base.per, num(base.iq, 10)) - num(base.iq, 10)) * 5 +
    round2((num(base.speed, (num(base.dx, 10) + num(base.ht, 10)) / 4) - ((num(base.dx, 10) + num(base.ht, 10)) / 4)) * 20) +
    (num(base.move, Math.floor(num(base.speed, 5))) - Math.floor(num(base.speed, 5))) * 5;

  const traitTotal = (character.traits ?? []).reduce((total, trait) => total + signedTraitCost(trait), 0);
  const skillTotal = (character.skills ?? []).reduce((total, skill) => total + num(skill.points, 0), 0);
  const spellTotal = (character.spells ?? []).reduce((total, spell) => total + num(spell.points, 0), 0);
  const spent = primary + secondary + traitTotal + skillTotal + spellTotal;
  const budget = num(character.points?.budget, 0);
  const unspent = budget - spent;

  return {
    primary,
    secondary,
    traitTotal,
    skillTotal,
    spellTotal,
    spent,
    budget,
    unspent,
    hpMax: effective.hp,
    fpMax: effective.fp
  };
}

export function signedTraitCost(trait) {
  const level = Math.max(1, num(trait.level, 1));
  const base = Math.abs(num(trait.cost, 0)) * level;
  if (trait.type === 'disadvantage' || trait.type === 'quirk') return -base;
  return base;
}

export function calculateRelativeLevel(points, difficulty) {
  const p = num(points, 0);
  const diff = String(difficulty || 'A').toUpperCase();
  if (p <= 0) return null;

  if (diff === 'E') {
    if (p === 1) return 0;
    if (p === 2) return 1;
    if (p === 3) return 1;
    if (p === 4) return 2;
    return 2 + Math.floor((p - 4) / 4);
  }

  if (diff === 'A') {
    if (p === 1) return -1;
    if (p === 2) return 0;
    if (p === 3) return 0;
    if (p === 4) return 1;
    return 1 + Math.floor((p - 4) / 4);
  }

  if (diff === 'H') {
    if (p === 1) return -2;
    if (p === 2 || p === 3) return -1;
    if (p === 4) return 0;
    if (p <= 7) return 0;
    if (p === 8) return 1;
    return 1 + Math.floor((p - 8) / 4);
  }

  if (p === 1) return -3;
  if (p === 2 || p === 3) return -2;
  if (p === 4) return -1;
  if (p <= 7) return -1;
  if (p === 8 || p <= 11) return 0;
  if (p === 12) return 1;
  return 1 + Math.floor((p - 12) / 4);
}

export function calculateSkillLevel(entry, effectiveAttributes, bonuses) {
  const key = String(entry.attribute || 'IQ').toLowerCase();
  const baseAttribute = num(effectiveAttributes[key], 10);
  const relative = calculateRelativeLevel(entry.points, entry.difficulty);
  const scoped = getBonus(bonuses, `skill.${entry.name}`);
  const shared = getBonus(bonuses, 'skill.all');
  if (relative === null) return '—';
  return baseAttribute + relative + num(entry.bonus, 0) + shared + scoped;
}

export function calculateSpellLevel(entry, effectiveAttributes, bonuses) {
  const key = String(entry.attribute || 'IQ').toLowerCase();
  const baseAttribute = num(effectiveAttributes[key], 10);
  const relative = calculateRelativeLevel(entry.points, entry.difficulty || 'H');
  const scoped = getBonus(bonuses, `spell.${entry.name}`);
  const shared = getBonus(bonuses, 'spell.all');
  if (relative === null) return '—';
  return baseAttribute + relative + num(entry.bonus, 0) + shared + scoped;
}

export function calculateEncumbrance(character, st) {
  const carriedWeight = (character.equipment ?? [])
    .filter((item) => item.carried !== false)
    .reduce((total, item) => total + num(item.qty, 1) * num(item.weight, 0), 0);

  const basicLiftKg = round2((st * st) / 10);
  const levels = [
    { name: 'Sem carga', max: basicLiftKg * 1, moveMod: 0, dodgeMod: 0 },
    { name: 'Leve', max: basicLiftKg * 2, moveMod: -1, dodgeMod: -1 },
    { name: 'Média', max: basicLiftKg * 3, moveMod: -2, dodgeMod: -2 },
    { name: 'Pesada', max: basicLiftKg * 6, moveMod: -3, dodgeMod: -3 },
    { name: 'Muito pesada', max: basicLiftKg * 10, moveMod: -4, dodgeMod: -4 }
  ];
  const active = levels.find((level) => carriedWeight <= level.max) ?? levels.at(-1);

  return {
    carriedWeight: round2(carriedWeight),
    basicLiftKg,
    active,
    levels
  };
}

export function difficultyOptions() {
  return Object.keys(DIFFICULTY_OFFSETS);
}
