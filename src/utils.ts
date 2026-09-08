import { getAttributedStoreURL, initializeAttribution } from "./appsflyer";
import { CAMPAIGN_IDS } from "./constants";

export type Platform = 'android' | 'ios';

export function getStoreUrl(platform: Platform, source: string): string {
    return platform === 'android'
        ? `https://play.google.com/store/apps/details?id=com.chasecarnaroli.qrme_contact&utm_source=${source}`
        : `https://apps.apple.com/app/apple-store/id1412627381?pt=119166549&ct=${source}&mt=8&platform=iphone`;
}

export function getAttributionSource(defaultSource: string = CAMPAIGN_IDS.WEBSITE): string {
    // Attribution tracking source
    let source: string = defaultSource;
    // Check for Google Ads campaign ID 
    const urlParams = new URLSearchParams(window.location.search);
    const gadCampaignId = urlParams.get('gad_campaignid');
    if (gadCampaignId) { 
        source = gadCampaignId; 
    }
    // Check for Microsoft Ads
    const msClickId = urlParams.get('msclkid');
    if (msClickId) {
        source = CAMPAIGN_IDS.MICROSOFT_AD;
    }
    // Check for Facebook
    const fbClickId = urlParams.get('fbclid');
    if (fbClickId) {
        source = CAMPAIGN_IDS.FACEBOOK_AD;
    }
    // Check for OpenAI referral parameters
    if (urlParams.has('oppref') || urlParams.has('olref')) {
        source = CAMPAIGN_IDS.OPENAI;
    }
    // Check for a standard utm_source on inbound links
    const utmSource = urlParams.get('utm_source');
    if (utmSource) {
        source = utmSource;
    }
    // Check for custom ref parameter (highest priority, explicit override)
    const ref = urlParams.get('ref');
    if (ref) {
        source = ref;
    }
    return source;
}

/**
 * Attributes every store link on the page, in two passes.
 *
 * The served HTML carries a build-time attribution source, because the real one
 * depends on this visit's query string. The first pass corrects it synchronously;
 * the second waits on AppsFlyer and re-points the link at the click URL, leaving
 * the direct link in place when attribution is unavailable.
 *
 * Anchors opt in with `data-store-link`:
 *   "ios" | "android"  a fixed store, attributed by pinning af_r to that store URL.
 *   "auto"             the visitor's own store, attributed by handing off to
 *                      OneLink template routing, which only resolves on mobile.
 * `data-store-source` overrides the default campaign ID for that link.
 */
export function attributeStoreLinks(root: ParentNode = document): void {
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a[data-store-link]')];
    if (!links.length) return;

    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);

    const resolved = links.map(link => {
        const declared = link.dataset.storeLink;
        const auto = declared === 'auto';
        const platform = (auto ? (isAndroid ? 'android' : 'ios') : declared) as Platform;
        const directURL = getStoreUrl(platform, getAttributionSource(link.dataset.storeSource));
        link.href = directURL;
        return { link, directURL, auto };
    });

    initializeAttribution().then(clickURL => {
        if (!clickURL) return;
        for (const { link, directURL, auto } of resolved) {
            if (!auto) link.href = getAttributedStoreURL(clickURL, directURL);
            else if (isMobile) link.href = clickURL;
        }
    });
}
