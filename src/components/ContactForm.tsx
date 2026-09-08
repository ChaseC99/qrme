// The query parameter names in our URL match the field names the Tally form expects,
// so they can be forwarded through to the embed as-is.
const TALLY_FIELDS = ['platform', 'device', 'os_version', 'qrme_version', 'support_id'];
const TALLY_EMBED_URL = 'https://tally.so/embed/xXbEWE';

export default function ContactForm() {
    const params = new URLSearchParams(window.location.search);

    const embedParams = new URLSearchParams({
        hideTitle: '1',
        transparentBackground: '1',
    });

    for (const field of TALLY_FIELDS) {
        const value = params.get(field);
        if (value) {
            embedParams.set(field, value);
        }
    }

    return (
        <iframe
            id="contact-form"
            src={`${TALLY_EMBED_URL}?${embedParams.toString()}`}
            title="QR Me Contact Form"
            loading="lazy"
            width="100%"
            height="1200"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
        >
            Loading contact form...
        </iframe>
    )
}
