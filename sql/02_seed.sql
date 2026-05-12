-- ============================================================
-- SODALIS — Seed: dati di default
-- ============================================================

-- ─── action_types di default (group_id = null → globali) ────
insert into action_types (id, group_id, label, emoji, is_default) values
  (uuid_generate_v4(), null, 'ha offerto da bere',      '🍺', true),
  (uuid_generate_v4(), null, 'ha guidato',               '🚗', true),
  (uuid_generate_v4(), null, 'ha organizzato la serata', '📋', true),
  (uuid_generate_v4(), null, 'ha pagato per tutti',      '💳', true),
  (uuid_generate_v4(), null, 'deve una pizza',           '🍕', true),
  (uuid_generate_v4(), null, 'ha accompagnato a casa',   '🏠', true),
  (uuid_generate_v4(), null, 'ha fatto un favore',       '🤝', true),
  (uuid_generate_v4(), null, 'ha prestato soldi',        '💸', true),
  (uuid_generate_v4(), null, 'ha cucinato',              '👨‍🍳', true),
  (uuid_generate_v4(), null, 'ha comprato la birra',     '🛒', true);

-- ─── tribunal_categories di default (group_id = null → globali) ─
insert into tribunal_categories (id, group_id, name, emoji, is_default, order_index) values
  (uuid_generate_v4(), null, 'MVP della serata',       '🏆', true, 1),
  (uuid_generate_v4(), null, 'Peggior scusa',           '🤥', true, 2),
  (uuid_generate_v4(), null, 'Ritardatario seriale',    '⏰', true, 3),
  (uuid_generate_v4(), null, 'Miglior frase della sera','💬', true, 4),
  (uuid_generate_v4(), null, 'Più confuso della serata','🌀', true, 5),
  (uuid_generate_v4(), null, 'Miglior organizzatore',   '📌', true, 6),
  (uuid_generate_v4(), null, 'Quello che ha esagerato', '🚨', true, 7),
  (uuid_generate_v4(), null, 'Il più silenzioso',       '🤫', true, 8);
