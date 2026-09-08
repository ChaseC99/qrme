import appStoreBadge from "../images/apple/appstore_black.svg";
import googlePlayBadge from "../images/android/google-play-badge.png";
import { getAttributionSource, getStoreUrl, type Platform } from "../utils";
import "./DownloadBadge.css";

export type DownloadBadgeProps = {
    platform: Platform;
    defaultSource?: string;
}

export default function DownloadBadge(props: DownloadBadgeProps) {
    const { platform, defaultSource } = props;
    const isAndroid = platform === 'android';

    // Construct the appropriate download link
    const href = getStoreUrl(platform, getAttributionSource(defaultSource));
    const aria = isAndroid ? 'Link to Google Play' : 'Link to the App Store';
    const alt = isAndroid ? 'Download on Google Play' : 'Download on the App Store';
    const badge = isAndroid ? googlePlayBadge : appStoreBadge;

    return (
        <a href={href} target="_blank" aria-label={aria}>
            <img src={badge.src} alt={alt} className="download-badge__img" />
        </a>
    );
}
