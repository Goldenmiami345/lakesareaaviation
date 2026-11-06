/** Fail closed until the database explicitly enables visitor models. */
export const modelsEnabled = (value: unknown): boolean => value === true;