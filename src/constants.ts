// /src/constants.ts

export const CAMPAIGN_IDS = {
    // Active
    WEBSITE: 'website',
    DOWNLOAD_PAGE: 'website_download_page',

    // Inactive
    // Might use these one day for more specific tracking
    DOWNLOAD_BUTTON: 'website_download_button',
    HEADLINE_BUTTON: 'website_headline',
} as const;

export type CampaignId = typeof CAMPAIGN_IDS[keyof typeof CAMPAIGN_IDS];