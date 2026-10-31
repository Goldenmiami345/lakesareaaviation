import { expect, test } from 'bun:test';
import { verifyPrerender } from './verify-prerender';

test('rejects a 200-status empty SSR suspense shell', () => {
  expect(() => verifyPrerender({ page: { path: '/about' }, html: '<html><body><!--$!--><template></template><!--/$--></body></html>' })).toThrow('Incomplete production HTML');
});
test('rejects a heading without the route content', () => {
  expect(() => verifyPrerender({ page: { path: '/' }, html: '<body><h1>Zero to Hero.</h1></body>' })).toThrow();
});