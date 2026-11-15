export function validateTitle(s) {
  if (s.length < 1 || s.length > 120) {
    return { valid: false, error: "title must be between 1 and 120 characters" };
  }
  return { valid: true };
}

export function validatePriority(s) {
  if (!["low", "medium", "high"].includes(s)) {
    return { valid: false, error: "priority must be low, medium, or high" };
  }
  return { valid: true };
}

export function validateTag(s) {
  if (s.length === 0) {
    return { valid: false, error: "tag value must not be empty" };
  }
  if (!/^[a-z0-9-]+$/.test(s)) {
    return { valid: false, error: "tags must be lowercase letters, digits, or hyphens only" };
  }
  return { valid: true };
}

export function validateId(s) {
  const n = parseInt(s, 10);
  if (isNaN(n)) {
    return { valid: false, error: "id must be an integer" };
  }
  if (n <= 0) {
    return { valid: false, error: "id must be a positive integer" };
  }
  return { valid: true };
}
