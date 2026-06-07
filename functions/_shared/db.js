function parseStoredJson(raw, context) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('invalid stored JSON in deck_shares', context, error);
    return null;
  }
}

export function mapPublicDeckRow(row) {
  const deck_json = parseStoredJson(row.deck_json, {
    share_id: row.share_id,
    field: 'deck_json',
  });
  const rule_json = parseStoredJson(row.rule_json, {
    share_id: row.share_id,
    field: 'rule_json',
  });
  if (deck_json === null || rule_json === null) return null;

  return {
    share_id: row.share_id,
    title: row.title,
    author_name: row.author_name,
    description: row.description,
    deck_json,
    rule_json,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

export function mapPublicDeckListRow(row) {
  return {
    share_id: row.share_id,
    title: row.title,
    author_name: row.author_name,
    description: row.description,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

export function mapAdminDeckListRow(row) {
  return {
    id: row.id,
    share_id: row.share_id,
    title: row.title,
    author_name: row.author_name,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
  };
}

export function mapPublicMessageRow(row) {
  return {
    author_name: row.author_name,
    message: row.message,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

export function mapAdminMessageRow(row) {
  return {
    id: row.id,
    author_name: row.author_name,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
  };
}

export function mapAdminDeckDetailRow(row) {
  const deck_json = parseStoredJson(row.deck_json, {
    id: row.id,
    field: 'deck_json',
  });
  const rule_json = parseStoredJson(row.rule_json, {
    id: row.id,
    field: 'rule_json',
  });
  if (deck_json === null || rule_json === null) return null;

  return {
    id: row.id,
    share_id: row.share_id,
    title: row.title,
    author_name: row.author_name,
    description: row.description,
    status: row.status,
    deck_json,
    rule_json,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
  };
}
