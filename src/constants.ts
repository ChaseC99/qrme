// /src/constants.ts

export const CAMPAIGN_IDS = {
    // Active
    WEBSITE: 'website',
    DOWNLOAD_PAGE: 'download',
    MICROSOFT_AD: 'msft',
    FACEBOOK_AD: 'facebook',
    OPENAI: 'openai',
    // Scanned from the QR code shown when hovering a badge on desktop
    DESKTOP: 'desktop',

    // Inactive
    // Might use these one day for more specific tracking
    DOWNLOAD_BUTTON: 'website_download_button',
    HEADLINE_BUTTON: 'website_headline',
} as const;

export type CampaignId = typeof CAMPAIGN_IDS[keyof typeof CAMPAIGN_IDS];