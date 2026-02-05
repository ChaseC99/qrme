import { CAMPAIGN_IDS } from "./constants";

export function getAttributionSource(): string {
    // Attribution tracking source
    let source: string = CAMPAIGN_IDS.WEBSITE;
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
    return source;
}