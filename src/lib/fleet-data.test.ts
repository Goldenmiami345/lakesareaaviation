import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fleet, airportTraffic } from './site-data';
import { KLXL_OBLIQUE_PATTERN } from './oblique-view';

test('fleet lists Phoenix then replacement Apache then the existing order', () => assert.deepEqual(fleet.map(p => p.registration), ['N8570B','N4383P','N6717A','N6641F','N96150','N11059','N7108G']));
test('replacement Apache has owner-supplied rates', () => { const p = fleet.find(p => p.registration === 'N4383P'); assert.equal(p?.rate, '$395/hr'); assert.equal(p?.prepay, '$375/hr'); });
test('replacement Apache uses factual registry specs only', () => { const p = fleet.find(p => p.registration === 'N4383P'); assert.equal(p?.name, '1960 Piper Apache'); assert.equal(p?.role, 'twin'); assert.equal(p?.use, 'Multi-engine training'); assert.deepEqual(p?.specs, { Year:'1960', Model:'PA-23-160', Engines:'2 × Lycoming O-320', Seats:'4' }); assert.equal(p?.nickname, undefined); assert.equal(p?.panel, undefined); });
test('Phoenix name and year both use 1957 pending confirmation', () => { const p = fleet.find(p => p.registration === 'N8570B'); assert.equal(p?.name, '1957 Cessna 172'); assert.equal(p?.specs?.['Year'], '1957'); });
test('retired Apache is replaced in aerial and oblique aircraft lists', () => { assert.ok(airportTraffic.KLXL.aircraft.includes('N4383P')); assert.ok(KLXL_OBLIQUE_PATTERN.aircraft.includes('N4383P')); assert.equal(JSON.stringify([fleet,airportTraffic,KLXL_OBLIQUE_PATTERN]).includes('N3353P'),false); });
test('walkarounds retain all 15 Apache and 20 Phoenix real frames', () => { assert.equal(fleet.find(p=>p.registration==='N4383P')?.walkaround?.length,15); assert.equal(fleet.find(p=>p.registration==='N8570B')?.walkaround?.length,20); });
