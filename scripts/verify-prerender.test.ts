import { expect, test } from 'bun:test';
import { verifyPrerender } from './verify-prerender';

test('rejects a 200-status empty SSR suspense shell', () => {
  expect(() => verifyPrerender({ page: { path: '/about' }, html: '<html><body><!--$!--><template></template><!--/$--></body></html>' })).toThrow('Incomplete production HTML');
});
test('rejects a heading without the route content', () => {
  expect(() => verifyPrerender({ page: { path: '/' }, html: '<body><h1>Zero to Hero.</h1></body>' })).toThrow();
});
test('accepts complete server HTML', () => {
  expect(() => verifyPrerender({ page: { path: '/' }, html: '<body><h1>Zero to Hero.</h1><p>From your first flight to commercial pilot and instructor.</p></body>' })).not.toThrow();
});
test('rejects fleet HTML with registrations out of order', () => {
  const html = '<body><h1>The airplanes you’ll actually fly.</h1><p>Real photos, real tail numbers and the published rates for every airplane in the Lakes Area Aviation fleet.</p>N4383P N8570B N46201 N6717A N6641F N96150 N11059 N7108G</body>';
  expect(() => verifyPrerender({ page: { path: '/fleet' }, html })).toThrow('out of order');
});