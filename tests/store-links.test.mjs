import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { buildSync } from 'esbuild';

// Use the project's existing bundler to resolve the production TypeScript imports.
// Each page gets an isolated module instance, including the cached initializer.
const utilities = buildSync({
    entryPoints: [fileURLToPath(new URL('../src/utils.ts', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
}).outputFiles[0].text;
const vendor = readFileSync(new URL('../public/vendor/appsflyer/onelink-smart-script-v2.9.2.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
const apple = 'https://apps.apple.com/app/apple-store/id1412627381';
const play = 'https://play.google.com/store/apps/details';

function anchor(platform, source) {
    return {
        href: 'https://example.com/original',
        dataset: {
            ...(platform === undefined ? {} : { storeLink: platform }),
            ...(source === undefined ? {} : { storeSource: source }),
        },
    };
}

function rootFor(links) {
    return {
        querySelectorAll(selector) {
            assert.equal(selector, 'a[data-store-link]');
            return links.filter(link => 'storeLink' in link.dataset);
        },
    };
}

function page({ query = '', userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', links = [anchor('ios'), anchor('android'), anchor('auto')], blockedStorage = false } = {}) {
    const scripts = [];
    const timers = new Map();
    let nextTimer = 0;
    const location = new URL(`https://qrme.contact/?${query}`);
    const document = {
        ...rootFor(links),
        referrer: '',
        URL: location.href,
        createElement(tag) { assert.equal(tag, 'script'); return {}; },
        head: { append(script) { scripts.push(script); } },
    };
    const context = createContext({
        module: { exports: {} },
        document,
        window: { location },
        navigator: { userAgent },
        URL, URLSearchParams,
        localStorage: {
            getItem(key) { if (blockedStorage) throw new Error('Storage blocked'); return this[key] ?? null; },
            setItem(key, value) { if (blockedStorage) throw new Error('Storage blocked'); this[key] = value; },
        },
        setTimeout(callback, milliseconds) { timers.set(++nextTimer, { callback, milliseconds }); return nextTimer; },
        clearTimeout(id) { timers.delete(id); },
        console: { log() {}, debug() {}, warn() {}, error() {} },
    });
    runInContext(utilities, context);
    return {
        links, scripts, timers,
        update(root) { context.module.exports.attributeStoreLinks(root); },
        load() { runInContext(vendor, context); scripts[0].onload(); },
        fail() { scripts[0].onerror(); },
        missingAPI() { scripts[0].onload(); },
        expire() {
            for (const { callback, milliseconds } of [...timers.values()]) {
                assert.equal(milliseconds, 5000);
                callback();
            }
        },
    };
}

function assertDirect(link, platform, source) {
    const url = new URL(link.href);
    assert.equal(url.origin + url.pathname, platform === 'ios' ? apple : play);
    assert.equal(url.searchParams.get(platform === 'ios' ? 'ct' : 'utm_source'), source);
    if (platform === 'android') assert.equal(url.searchParams.get('id'), 'com.chasecarnaroli.qrme_contact');
}

test('direct sources and Android routing are corrected before attribution finishes', async () => {
    const p = page({ query: 'gclid=new&gad_campaignid=123&ref=custom', userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
    p.update();
    assertDirect(p.links[0], 'ios', 'custom');
    assertDirect(p.links[1], 'android', 'custom');
    assertDirect(p.links[2], 'android', 'custom');
    await flush();
    assert.equal(p.scripts.length, 1);
    p.fail();
    await flush();
    assertDirect(p.links[0], 'ios', 'custom');
    assertDirect(p.links[1], 'android', 'custom');
    assertDirect(p.links[2], 'android', 'custom');
    assert.equal(p.timers.size, 0);
});

test('organic visits preserve each link source and never load Smart Script', async () => {
    for (const query of ['', 'utm_source=chatgpt.com', 'olref=organic', 'gad_campaignid=123']) {
        const p = page({ query, links: [anchor('ios', 'download'), anchor('android', 'desktop'), anchor('auto')] });
        p.update();
        await flush();
        const override = query.startsWith('utm_source') ? 'chatgpt.com' : query.startsWith('olref') ? 'openai' : query ? '123' : null;
        assertDirect(p.links[0], 'ios', override ?? 'download');
        assertDirect(p.links[1], 'android', override ?? 'desktop');
        assertDirect(p.links[2], 'ios', override ?? 'website');
        assert.equal(p.scripts.length, 0);
        assert.equal(p.timers.size, 0);
    }
});

test('Google and OpenAI enhance both fixed stores while auto routing stays mobile-only', async () => {
    for (const [query, pid, clickKey, clickValue] of [
        ['gclid=google-click&gad_campaignid=123', 'googleads_int', 'gclid', 'google-click'],
        ['oppref=openai-click&af_c_id=123', 'openai_int', 'clickid', 'openai-click'],
    ]) {
        for (const [userAgent, mobile] of [['Mozilla/5.0 (iPhone)', true], ['Mozilla/5.0 (Linux; Android 14)', true], ['Mozilla/5.0 (Macintosh)', false]]) {
            const p = page({ query, userAgent });
            p.update();
            const direct = p.links.map(link => link.href);
            await flush();
            p.load();
            await flush();
            for (const index of [0, 1, ...(mobile ? [2] : [])]) {
                const url = new URL(p.links[index].href);
                assert.equal(url.origin + url.pathname, 'https://app.qrme.contact/7AZi');
                assert.equal(url.searchParams.get('pid'), pid);
                assert.equal(url.searchParams.get(clickKey), clickValue);
                assert.equal(url.searchParams.get('af_c_id'), '123');
                assert.equal(url.searchParams.get('af_r'), index === 2 ? null : direct[index]);
            }
            if (!mobile) assert.equal(p.links[2].href, direct[2]);
            assert.equal(p.scripts.length, 1);
            assert.equal(p.timers.size, 0);
        }
    }
});

test('scoped updates leave unrelated links alone and share one script load', async () => {
    const untouched = anchor();
    const first = anchor('ios');
    const second = anchor('android');
    const p = page({ query: 'gclid=test', links: [first, second, untouched] });
    p.update(rootFor([first, untouched]));
    assert.equal(second.href, 'https://example.com/original');
    assert.equal(untouched.href, 'https://example.com/original');
    p.update(rootFor([second]));
    await flush();
    assert.equal(p.scripts.length, 1);
    p.load();
    await flush();
    assert.equal(new URL(first.href).hostname, 'app.qrme.contact');
    assert.equal(new URL(second.href).hostname, 'app.qrme.contact');
    // A later component can also consume the already-completed initializer.
    const later = anchor('ios');
    p.update(rootFor([later]));
    await flush();
    assert.equal(new URL(later.href).hostname, 'app.qrme.contact');
    assert.equal(p.scripts.length, 1);
    assert.equal(untouched.href, 'https://example.com/original');
});

test('a page with no opted-in store links does no attribution work', async () => {
    const untouched = anchor();
    const p = page({ query: 'gclid=test', links: [untouched] });
    p.update();
    await flush();
    assert.equal(untouched.href, 'https://example.com/original');
    assert.equal(p.scripts.length, 0);
    assert.equal(p.timers.size, 0);
});

test('missing API or blocked storage leaves every corrected direct link usable', async () => {
    for (const blockedStorage of [false, true]) {
        const p = page({ query: 'oppref=test', blockedStorage });
        p.update();
        const direct = p.links.map(link => link.href);
        await flush();
        if (blockedStorage) assert.throws(() => p.load(), /Storage blocked/);
        // Script evaluation errors still produce a load event but no API.
        p.missingAPI();
        await flush();
        assert.deepEqual(p.links.map(link => link.href), direct);
        assert.equal(p.timers.size, 0);
    }
});

test('a script that arrives after timeout never rewrites the direct links', async () => {
    const p = page({ query: 'gclid=test' });
    p.update();
    const direct = p.links.map(link => link.href);
    await flush();
    p.expire();
    await flush();
    p.load();
    await flush();
    assert.deepEqual(p.links.map(link => link.href), direct);
    assert.equal(p.timers.size, 0);
});
