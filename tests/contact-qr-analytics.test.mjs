import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/PostHog.astro', import.meta.url), 'utf8');
const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function analyticsPage() {
    const captured = [];
    const listeners = new Map();
    const posthog = {
        __SV: 1,
        init() {},
        capture: (...args) => captured.push(JSON.parse(JSON.stringify(args))),
    };
    const window = { posthog };
    runInNewContext(script, {
        window, posthog,
        document: { addEventListener: (name, listener) => listeners.set(name, listener) },
    });
    return { captured, window, emit: detail => listeners.get('qr-code-created')({ detail }) };
}

test('QR export events capture only the agreed method, excluding extra data', () => {
    const page = analyticsPage();
    for (const method of ['download_png', 'download_svg', 'copy_image']) {
        page.emit({ method, contact: 'Private contact data', filename: 'private-name.png' });
    }
    assert.deepEqual(page.captured, [
        ['QR Code Created', { method: 'download_png' }],
        ['QR Code Created', { method: 'download_svg' }],
        ['QR Code Created', { method: 'copy_image' }],
    ]);
});

test('QR export events ignore missing or unknown methods', () => {
    const page = analyticsPage();
    for (const detail of [undefined, null, {}, { method: 'unknown' }, { method: { contact: 'Private' } }]) {
        page.emit(detail);
    }
    assert.deepEqual(page.captured, []);
});

test('missing analytics does not interrupt an export', () => {
    const page = analyticsPage();
    delete page.window.posthog;
    assert.doesNotThrow(() => page.emit({ method: 'download_png' }));
});

test('analytics errors do not interrupt an export', () => {
    const page = analyticsPage();
    page.window.posthog.capture = () => { throw new Error('Analytics unavailable'); };
    assert.doesNotThrow(() => page.emit({ method: 'copy_image' }));
});
