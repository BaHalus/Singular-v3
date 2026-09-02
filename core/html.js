const ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (match) => ENTITY_MAP[match]);
}
