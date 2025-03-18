/**
 * Toggles the visibility of the navbar by adding or removing the 'show' class
 */
function toggleNavbar() {
    const navbar = document.getElementById('navbar-items');
    if (navbar.classList.contains('show')) {
        navbar.classList.remove('show');
    } else {
        navbar.classList.add('show');
    }
}

/**
 * Navigates to the appropriate app store based on the user's device
 * If the user is on an Android device, it opens the Google Play Store link
 * Otherwise, it opens the Apple App Store link
 * The App Store is the default because the listing is nicer
 */
function navigateToDownload() {
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isAndroid) {
        // Open the Google Play Store link
        window.open("https://play.google.com/store/apps/details?id=com.chasecarnaroli.qrme_contact", "_blank");
    } else {
        // Open the Apple App Store link
        // This is also the default if the user is coming from qrme.contact because the App Store listing is nicer
        window.open("https://apps.apple.com/app/apple-store/id1412627381?pt=119166549&ct=QR%20Me%20Website&mt=8&platform=iphone", "_blank");
    }
}