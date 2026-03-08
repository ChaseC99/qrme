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
    // Check for custom ref parameter
    const ref = urlParams.get('ref');
    if (ref) {
        source = ref;
    }
    return source;
}