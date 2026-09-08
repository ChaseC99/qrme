export const ONE_LINK_URL = 'https://app.qrme.contact/7AZi';
export const SMART_SCRIPT_PATH = '/vendor/appsflyer/onelink-smart-script-v2.9.2.js';

/** Ad networks whose landing-page traffic we hand to Smart Script. */
export type AdNetwork = 'google' | 'openai';

/**
 * Identifies the paid network behind this visit, or null for organic ones.
 *
 * Only explicit click context counts: a nonempty click ID or the network's own
 * `pid`. Google wins a tie because its integration predates OpenAI's and its
 * click IDs are the more specific signal.
 */
export function getAdNetwork(href: string): AdNetwork | null {
    try {
        const { searchParams } = new URL(href);
        const has = (key: string) => Boolean(searchParams.get(key)?.trim());
        const pid = searchParams.get('pid');
        if (['gclid', 'gbraid', 'wbraid'].some(has) || pid === 'googleads_int') return 'google';
        if (has('oppref') || pid === 'openai_int') return 'openai';
        return null;
    } catch {
        return null;
    }
}

const AF_PARAMETERS = {
    google: {
        mediaSource: { keys: [], defaultValue: 'googleads_int' },
        afCustom: [{ paramKey: 'af_c_id', keys: ['af_c_id', 'gad_campaignid'] }],
    },
    openai: {
        mediaSource: { keys: [], defaultValue: 'openai_int' },
        // Smart Script forwards Google's click IDs itself but knows nothing of
        // OpenAI's, and AppsFlyer needs `oppref` to arrive as `clickid` to send
        // conversions back to ChatGPT Ads. The rest are the dynamic URL macros
        // configured on the ad's landing page URL in ChatGPT Ads Manager.
        afCustom: [
            { paramKey: 'clickid', keys: ['oppref'] },
            { paramKey: 'af_c_id', keys: ['af_c_id'] },
            { paramKey: 'af_adset_id', keys: ['af_adset_id'] },
            { paramKey: 'af_ad_id', keys: ['af_ad_id'] },
            { paramKey: 'af_partner_account_id', keys: ['af_partner_account_id'] },
        ],
    },
} as const;

export function getSmartScriptConfig(network: AdNetwork) {
    return {
        oneLinkURL: ONE_LINK_URL,
        afParameters: AF_PARAMETERS[network],
    };
}

export function validateClickURL(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        const template = new URL(ONE_LINK_URL);
        return url.origin === template.origin &&
            url.pathname.replace(/\/$/, '') === template.pathname &&
            !url.username && !url.password ? value : null;
    } catch {
        return null;
    }
}

export function getAttributedStoreURL(clickURL: string, storeURL: string): string {
    const url = new URL(clickURL);
    for (const key of ['af_android_url', 'af_ios_url', 'af_web_dp']) url.searchParams.delete(key);
    url.searchParams.set('af_r', storeURL);
    return url.href;
}

export interface SmartScript {
    generateOneLinkURL: (config: ReturnType<typeof getSmartScriptConfig>) => { clickURL?: unknown } | null;
}

/** One attempt per page; the eligibility gate never reads stored attribution. */
export function createAttributionInitializer(
    load: () => Promise<SmartScript>,
    getHref: () => string,
    timeoutMs = 5000,
) {
    let pending: Promise<string | null> | undefined;
    return (): Promise<string | null> => {
        const network = getAdNetwork(getHref());
        if (!network) return Promise.resolve(null);
        return pending ??= new Promise(resolve => {
            let settled = false;
            const finish = (value: string | null) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(value);
            };
            const timer = setTimeout(() => finish(null), timeoutMs);
            Promise.resolve().then(load).then(api => {
                if (settled) return;
                finish(validateClickURL(api.generateOneLinkURL(getSmartScriptConfig(network))?.clickURL));
            }).catch(() => finish(null));
        });
    };
}

function loadSmartScript(): Promise<SmartScript> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SMART_SCRIPT_PATH;
        script.async = true;
        script.onload = () => {
            script.onload = script.onerror = null;
            const api = (window as Window & { AF_SMART_SCRIPT?: SmartScript }).AF_SMART_SCRIPT;
            if (typeof api?.generateOneLinkURL === 'function') resolve(api);
            else reject(new Error('Smart Script did not initialize'));
        };
        script.onerror = () => {
            script.onload = script.onerror = null;
            reject(new Error('Smart Script failed to load'));
        };
        document.head.append(script);
    });
}

export const initializeAttribution = createAttributionInitializer(
    loadSmartScript,
    () => typeof window === 'undefined' ? '' : window.location.href,
);
