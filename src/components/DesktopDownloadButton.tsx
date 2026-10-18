import { useEffect, useState } from 'react';
import { DESKTOP_QR_MEDIA } from '../constants';
import AppDownloadDialog from './AppDownloadDialog';
import './DownloadButton.css';

export default function DesktopDownloadButton() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const desktop = window.matchMedia(DESKTOP_QR_MEDIA);
        const closeOnMobile = () => { if (!desktop.matches) setOpen(false); };
        desktop.addEventListener('change', closeOnMobile);
        return () => desktop.removeEventListener('change', closeOnMobile);
    }, []);

    return <>
        <button type="button" className="download-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
            Download
        </button>
        <AppDownloadDialog open={open} onClose={() => setOpen(false)} />
    </>;
}
