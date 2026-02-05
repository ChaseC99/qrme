import appStoreBadge from "../images/apple/appstore_black.svg";
import googlePlayBadge from "../images/android/google-play-badge.png";
import { getAttributionSource } from "../utils";

export type DownloadBadgeProps = {
    platform: 'android' | 'ios';
}

export default function DownloadBadge(props: DownloadBadgeProps) {
    const { platform } = props;
    const isAndroid = platform === 'android';

    // Attribution tracking source
    const source = getAttributionSource();

    // Construct the appropriate download link
    const href = isAndroid
        ? `https://play.google.com/store/apps/details?id=com.chasecarnaroli.qrme_contact&utm_source=${source}`
        : `https://apps.apple.com/app/apple-store/id1412627381?pt=119166549&ct=${source}&mt=8&platform=iphone`;
    const aria = isAndroid ? 'Link to Google Play' : 'Link to the App Store';
    const alt = isAndroid ? 'Download on Google Play' : 'Download on the App Store';
    const badge = isAndroid ? googlePlayBadge : appStoreBadge;

    return (
        <a href={href} target="_blank" aria-label={aria}>
            <img src={badge.src} alt={alt} style={styles.downloadButtonImg} />
        </a>
    );
}

const styles = {
    downloadButtonImg: {
        width: '200px',
        height: 'auto',
    }
}
