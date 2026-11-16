const ANONYMOUS_ID_KEY = 'parking_anonymous_id';

export function getAnonymousId(): string {
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

