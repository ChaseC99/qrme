import { CAMPAIGN_IDS } from "./constants";

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
