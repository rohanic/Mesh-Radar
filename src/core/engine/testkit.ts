// Shared fixtures for engine tests.

/** Property names that must never reach analytics (no location, no identity). */
export const analyticsCases = ['lat', 'lon', 'location', 'groupId', 'memberName', 'text', 'phone'];
