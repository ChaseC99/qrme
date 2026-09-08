import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import {
    ONE_LINK_URL, getAdNetwork, getSmartScriptConfig,
    validateClickURL, getAttributedStoreURL, createAttributionInitializer,
} from '../src/appsflyer.ts';

const vendor = readFileSync(new URL('../public/vendor/appsflyer/onelink-smart-script-v2.9.2.js', import.meta.url), 'utf8');
const landing = 'https://qrme.contact/';
const attributed = `${landing}?gclid=test-click`;

function loadVendor(href, { blocked = false, storage = {} } = {}) {
    const localStorage = Object.assign(storage, {
        getItem(key) { if (blocked) throw new Error('Storage blocked'); return this[key] ?? null; },
        setItem(key, value) { if (blocked) throw new Error('Storage blocked'); this[key] = value; },
    });
    const window = { location: new URL(href) };
    runInNewContext(vendor, {
        window, localStorage, URL, URLSearchParams,
        navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
        document: { referrer: '', URL: href },
        console: { debug() {}, log() {}, warn() {}, error() {} },
    });
    return window.AF_SMART_SCRIPT;
}

test('vendored script matches the unmodified downloaded release', () => {
    assert.equal(createHash('sha256').update(vendor).digest('hex'), 'c52094824bd16b8c4109e27dd8ed32a5caa775af2e05a850ffadffb6b2754021');
});

test('only explicit, nonempty ad context activates, regardless of path', () => {
    for (const query of ['', '?foo=bar', '?utm_source=google', '?gad_source=5&gad_campaignid=123', '?gclid=', '?gclid=%20', '?pid=other', '?gclid=%', '?oppref=', '?oppref=%20', '?olref=x', '?utm_source=chatgpt.com']) {
        // URLSearchParams tolerates malformed percent escapes; nonempty IDs remain eligible.
        assert.equal(getAdNetwork(landing + query), query === '?gclid=%' ? 'google' : null, query);
    }
    for (const [query, network] of [['?gclid=a', 'google'], ['?gbraid=b', 'google'], ['?wbraid=c', 'google'], ['?pid=googleads_int', 'google'], ['?oppref=d', 'openai'], ['?pid=openai_int', 'openai']]) {
        assert.equal(getAdNetwork(landing + query + '#pricing'), network);
        assert.equal(getAdNetwork(landing + 'download' + query), network);
        assert.equal(getAdNetwork(landing + 'privacy' + query), network);
    }
    // A visit carrying both stays on Google, whichever order the parameters arrive in.
    assert.equal(getAdNetwork(`${landing}?gclid=a&oppref=d`), 'google');
    assert.equal(getAdNetwork(`${landing}?oppref=d&gclid=a`), 'google');
    assert.equal(getAdNetwork('not a URL'), null);
});

test('actual Smart Script maps campaign IDs and forwards Google click IDs', () => {
    for (const key of ['gclid', 'gbraid', 'wbraid']) {
        const api = loadVendor(`${landing}?gad_source=5&gad_campaignid=23416950698&${key}=test%2B%26id`);
        const url = new URL(api.generateOneLinkURL(getSmartScriptConfig('google')).clickURL);
        assert.equal(api.version, '2_9_2');
        assert.equal(url.origin + url.pathname, ONE_LINK_URL);
        assert.equal(url.searchParams.get('pid'), 'googleads_int');
        assert.equal(url.searchParams.get('af_c_id'), '23416950698');
        assert.equal(url.searchParams.get(key), 'test+&id');
        assert.equal(url.searchParams.has('gad_source'), false);
    }
});

test('explicit campaign ID takes precedence; source is forced; no campaign invented', () => {
    const api = loadVendor(`${attributed}&af_c_id=explicit&gad_campaignid=fallback&pid=other`);
    const url = new URL(api.generateOneLinkURL(getSmartScriptConfig('google')).clickURL);
    assert.equal(url.searchParams.get('af_c_id'), 'explicit');
    assert.equal(url.searchParams.get('pid'), 'googleads_int');
    const noCampaign = new URL(loadVendor(attributed).generateOneLinkURL(getSmartScriptConfig('google')).clickURL);
    assert.equal(noCampaign.searchParams.has('af_c_id'), false);
    assert.equal(noCampaign.searchParams.has('c'), false);
});

test('actual Smart Script sends OpenAI clicks as openai_int with oppref as clickid', () => {
    const api = loadVendor(`${landing}?oppref=OPP%2Babc&af_c_id=camp1&af_adset_id=grp2&af_ad_id=ad3&af_partner_account_id=acct4&gad_campaignid=notours`);
    const url = new URL(api.generateOneLinkURL(getSmartScriptConfig('openai')).clickURL);
    assert.equal(url.origin + url.pathname, ONE_LINK_URL);
    assert.equal(url.searchParams.get('pid'), 'openai_int');
    // AppsFlyer reports conversions back to ChatGPT Ads by this click ID.
    assert.equal(url.searchParams.get('clickid'), 'OPP+abc');
    assert.equal(url.searchParams.get('af_c_id'), 'camp1');
    assert.equal(url.searchParams.get('af_adset_id'), 'grp2');
    assert.equal(url.searchParams.get('af_ad_id'), 'ad3');
    assert.equal(url.searchParams.get('af_partner_account_id'), 'acct4');
    // Google's campaign fallback belongs to Google's config alone.
    assert.equal(url.searchParams.has('oppref'), false);

    const bare = new URL(loadVendor(`${landing}?oppref=OPP%2Babc`).generateOneLinkURL(getSmartScriptConfig('openai')).clickURL);
    assert.equal(bare.searchParams.get('clickid'), 'OPP+abc');
    for (const key of ['af_c_id', 'af_adset_id', 'af_ad_id', 'af_partner_account_id', 'c']) {
        assert.equal(bare.searchParams.has(key), false, key);
    }
});

test('a network only ever generates its own media source', () => {
    const both = `${landing}?gclid=g&oppref=o&gad_campaignid=123`;
    const google = new URL(loadVendor(both).generateOneLinkURL(getSmartScriptConfig('google')).clickURL);
    assert.equal(google.searchParams.get('pid'), 'googleads_int');
    assert.equal(google.searchParams.has('clickid'), false);
    const openai = new URL(loadVendor(both).generateOneLinkURL(getSmartScriptConfig('openai')).clickURL);
    assert.equal(openai.searchParams.get('pid'), 'openai_int');
    assert.equal(openai.searchParams.get('clickid'), 'o');
    assert.equal(openai.searchParams.has('af_c_id'), false);
});

test('rejects malformed or unexpected generated links', () => {
    for (const value of [null, undefined, {}, '', '/7AZi', 'javascript:alert(1)', 'http://app.qrme.contact/7AZi', 'https://evil.test/7AZi', `${ONE_LINK_URL}/other`, 'https://user:pass@app.qrme.contact/7AZi', 'https://app.qrme.contact:444/7AZi']) {
        assert.equal(validateClickURL(value), null);
    }
    assert.equal(validateClickURL(`${ONE_LINK_URL}/?gclid=x`), `${ONE_LINK_URL}/?gclid=x`);
});

test('both store links retain attribution and replace conflicting redirects', () => {
    for (const store of ['https://apps.apple.com/app/apple-store/id1412627381?pt=119166549&ct=desktop', 'https://play.google.com/store/apps/details?id=com.chasecarnaroli.qrme_contact&utm_source=desktop']) {
        const url = new URL(getAttributedStoreURL(`${ONE_LINK_URL}?pid=googleads_int&gclid=a%2Bb&af_c_id=123&af_r=old&af_ios_url=bad&af_android_url=bad&af_web_dp=bad`, store));
        assert.equal(url.searchParams.get('af_r'), store);
        assert.equal(url.searchParams.get('gclid'), 'a+b');
        assert.equal(url.searchParams.get('af_c_id'), '123');
        assert.equal(url.searchParams.get('pid'), 'googleads_int');
        for (const key of ['af_ios_url', 'af_android_url', 'af_web_dp']) assert.equal(url.searchParams.has(key), false);
    }
});

test('one shared attempt works for consumers before and after completion', async () => {
    let calls = 0;
    const clickURL = `${ONE_LINK_URL}?pid=googleads_int&gclid=test`;
    const init = createAttributionInitializer(async () => {
        calls++;
        return { generateOneLinkURL: () => ({ clickURL }) };
    }, () => attributed);
    const first = init();
    assert.equal(init(), first);
    assert.equal(await first, clickURL);
    assert.equal(await init(), clickURL);
    assert.equal(calls, 1);
});

test('the initializer configures Smart Script for the network in the URL', async () => {
    for (const [query, pid] of [['gclid=test-click', 'googleads_int'], ['oppref=OPP-1', 'openai_int']]) {
        const href = `${landing}?${query}`;
        const clickURL = await createAttributionInitializer(async () => loadVendor(href), () => href)();
        assert.equal(new URL(clickURL).searchParams.get('pid'), pid);
    }
});

test('organic visits never load, even after a previous attributed result', async () => {
    let href = attributed;
    let calls = 0;
    const init = createAttributionInitializer(async () => {
        calls++;
        return loadVendor(href);
    }, () => href);
    assert.ok(await init());
    href = landing;
    assert.equal(await init(), null);
    href = landing + 'download';
    assert.equal(await init(), null);
    assert.equal(calls, 1);
    const organic = createAttributionInitializer(() => { throw new Error('must not load'); }, () => landing);
    assert.equal(await organic(), null);
});

test('load, API, generation and storage failures all resolve to the direct-link fallback', async () => {
    const loaders = [
        () => Promise.reject(new Error('Network error')),
        () => { throw new Error('Synchronous failure'); },
        async () => undefined,
        async () => ({}),
        async () => ({ generateOneLinkURL() { throw new Error('Generation error'); } }),
        async () => ({ generateOneLinkURL: () => null }),
        async () => ({ generateOneLinkURL: () => ({}) }),
        async () => ({ generateOneLinkURL: () => ({ clickURL: 'https://unexpected.test/' }) }),
        async () => loadVendor(attributed, { blocked: true }),
    ];
    for (const load of loaders) assert.equal(await createAttributionInitializer(load, () => attributed)(), null);
});

test('timeout retains fallback and ignores a late script load', async () => {
    let completeLoad;
    let generations = 0;
    const init = createAttributionInitializer(() => new Promise(resolve => { completeLoad = resolve; }), () => attributed, 5);
    assert.equal(await init(), null);
    completeLoad({ generateOneLinkURL() { generations++; return { clickURL: ONE_LINK_URL }; } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(await init(), null);
    assert.equal(generations, 0);
});
