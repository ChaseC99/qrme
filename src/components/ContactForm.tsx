export default function ContactForm() {
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
    const googleFormsEmbeddedLink = `https://docs.google.com/forms/d/e/1FAIpQLScqT77ZMt-Avzk8JQsEDO4SbwZD4e6jxcIQiJmWt58ZdUiYdA/viewform?usp=pp_url&${googleFormFields.platform}=${platform}&${googleFormFields.device}=${device}&${googleFormFields.osVersion}=${osVersion}&${googleFormFields.qrmeVersion}=${qrmeVersion}&embedded=true`;

    return (
        <iframe 
            id="contact-form"
            src={googleFormsEmbeddedLink}
            title="QR Me Contact Feedback Google Form"
            width="100%" 
            height="1000" 
            frameBorder="0" 
        >
            Loading contact form...
        </iframe>
    )
}