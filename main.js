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

/**
 * Generates a Google Forms link with the query parameters from the URL
 * The query parameters are mapped to the corresponding Google Forms fields
 * The generated link is used to pre-fill the form with the user's information
 *
 * @returns {string} The generated Google Forms link
 */
function generateGoogleFormsLink() {
    // Map the query parameters to the Google Forms fields
    const googleFormFields = {
        platform: 'entry.1498958727',
        device: 'entry.1473862599',
        osVersion: 'entry.388596581',
        qrmeVersion: 'entry.571404993'
    };

    // Get the query parameters from the URL
    const params = new URLSearchParams(window.location.search);

    const platform = params.get('platform') || '';
    const device = params.get('device') || '';
    const osVersion = params.get('os_version') || '';
    const qrmeVersion = params.get('qrme_version') || '';

    // Construct the Google Forms link with the query parameters
    const googleFormsLink = `https://docs.google.com/forms/d/e/1FAIpQLScqT77ZMt-Avzk8JQsEDO4SbwZD4e6jxcIQiJmWt58ZdUiYdA/viewform?usp=pp_url&${googleFormFields.platform}=${platform}&${googleFormFields.device}=${device}&${googleFormFields.osVersion}=${osVersion}&${googleFormFields.qrmeVersion}=${qrmeVersion}&embedded=true`;

    return googleFormsLink;
}