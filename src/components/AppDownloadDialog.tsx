import { useEffect, useId, useMemo, useRef, useState } from 'react';
import appStoreBadge from '../images/apple/appstore_black.svg';
import googlePlayBadge from '../images/android/google-play-badge.png';
import { CAMPAIGN_IDS } from '../constants';
import { attributeStoreLinks, getDownloadQrUrl, getStoreUrl } from '../utils';
import { qrMatrix, qrMeWebsite, qrSvg } from '../contact-qr';
import StarRating from './StarRating';
import './AppDownloadDialog.css';

export default function AppDownloadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const downloadQr = useMemo(() => {
        if (!downloadUrl) return '';
        const matrix = qrMatrix(downloadUrl);
        return matrix ? qrSvg(matrix, 188) : '';
    }, [downloadUrl]);

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (!open) {
            if (element.open) element.close();
            return;
        }
        if (!element.open) element.showModal();
        attributeStoreLinks(element);
        let cancelled = false;
        setDownloadUrl(null);
        getDownloadQrUrl(qrMeWebsite.url, window.location.search).then(url => {
            if (!cancelled) setDownloadUrl(url);
        });
        return () => { cancelled = true; };
    }, [open]);

    return <dialog ref={dialog} className="cq-app-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
        onClose={onClose} onClick={event => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
        }}>
        <button type="button" className="cq-dialog-close" aria-label="Close app information" autoFocus onClick={() => dialog.current?.close()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        <img className="cq-dialog-logo" src="/logo.png" width="72" height="72" alt=""/>
        <h2 id={titleId}><span className="cq-highlight">QR Me - Contact</span></h2>
        <p id={descriptionId} className="cq-dialog-lede">Quickly and easily share your contact info with a QR code</p>
        <div className="cq-dialog-badges">
            <a href={getStoreUrl('ios', CAMPAIGN_IDS.WEBSITE)} target="_blank" rel="noopener noreferrer"
                data-store-link="ios" data-store-source={CAMPAIGN_IDS.WEBSITE} aria-label="Download on the App Store">
                <img src={appStoreBadge.src} alt="Download on the App Store" width="180" height="60"/>
            </a>
            <a href={getStoreUrl('android', CAMPAIGN_IDS.WEBSITE)} target="_blank" rel="noopener noreferrer"
                data-store-link="android" data-store-source={CAMPAIGN_IDS.WEBSITE} aria-label="Get it on Google Play">
                <img src={googlePlayBadge.src} alt="Get it on Google Play" width="180" height="60"/>
            </a>
        </div>
        {downloadQr && <div className="cq-dialog-download-qr">
            <div role="img" aria-label="QR code to download the QR Me app"
                dangerouslySetInnerHTML={{ __html: downloadQr }}/>
            <p>Scan to download QR Me</p>
        </div>}
        <div className="cq-dialog-stats">
            <div><strong>200k+</strong><span>Downloads</span></div>
            <div>
                <div className="cq-dialog-rating"><strong>4.9</strong><StarRating rating={4.9} size={13} gap={1} /></div>
                <span>App Store rating</span>
            </div>
            <div><strong>Free</strong><span>Download</span></div>
        </div>
    </dialog>;
}
