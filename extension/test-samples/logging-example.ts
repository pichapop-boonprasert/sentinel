// TypeScript logging example for PII detection

function processUser(firstName: string, lastName: string) {
  // These SHOULD trigger pii-logging-unmasked warnings
  console.log("User:", firstName, lastName);
  console.warn(`Processing ${firstName} ${lastName}`);
  console.error("Failed for user: " + firstName);

  // These should NOT trigger logging warnings (masked)
  console.log("User:", maskHelper.mask(firstName));
  console.log("User: [REDACTED]");

  // These should NOT trigger logging warnings (not in log context)
  const displayName = `${firstName} ${lastName}`;
  const user = { firstName, lastName };
  return user;
}
