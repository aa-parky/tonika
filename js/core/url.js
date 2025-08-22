export function getQueryBool(key, fallback = null) {
  const params = new URLSearchParams(location.search);
  if (!params.has(key)) return fallback;
  const v = params.get(key)?.toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}
