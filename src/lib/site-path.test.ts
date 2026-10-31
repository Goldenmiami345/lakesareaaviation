import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sitePath } from './site-path';
test('contact has identical action-bar policy with and without prerender slash', () => {
  assert.equal(sitePath('/contact/'), '/contact');
  assert.equal(sitePath('/contact'), '/contact');
});
test('home stays the home path with trailing slash normalization', () => {
  assert.equal(sitePath('/'), '/');
  assert.equal(sitePath('/fleet/'), '/fleet');
});