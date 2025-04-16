export default function DownloadButton() {
    const isAndroid = /Android/.test(navigator.userAgent);

    // Open the Google Play Store for Android devices
    // Open the Apple App Store for iOS devices
    // App Store is the default because it's nicer
    const url = isAndroid
        ? "https://play.google.com/store/apps/details?id=com.chasecarnaroli.qrme_contact&utm_source=website"
        : "https://apps.apple.com/app/apple-store/id1412627381?pt=119166549&ct=QR%20Me%20Website&mt=8&platform=iphone";
    
    return (
        <a href={url} style={styles.downloadButton}>Download</a>
    );
}

const styles = {
    downloadButton: {
        textDecoration: 'none',
        backgroundColor: '#a8edfe',
        borderRadius: '8px',
        padding: '8px',
        color: 'black',
    }
}