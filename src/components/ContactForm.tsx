import { useEffect, useId, useState, type FormEvent } from 'react';
import { SUPPORT_EMAIL } from '../constants';
import { feedbackMailto, feedbackFromSearch, type Feedback } from '../contact-feedback';
import './ContactForm.css';

const deviceFields = [
    ['device', 'Device', 'iPhone 16, Pixel 10'],
    ['osVersion', 'OS version', 'iOS 26.2, Android 16'],
    ['qrmeVersion', 'QR Me version', '-'],
    ['supportId', 'Support ID', '-'],
] as const;

export default function ContactForm() {
    const id = useId();
    const [feedback, setFeedback] = useState(() => feedbackFromSearch(''));

    useEffect(() => {
        setFeedback(feedbackFromSearch(window.location.search));
    }, []);

    function updateField<K extends keyof Feedback>(field: K, value: Feedback[K]) {
        setFeedback(current => ({ ...current, [field]: value }));
    }

    function openEmail(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const mailto = feedbackMailto(feedback);
        if (!mailto) return;

        window.location.href = mailto;
    }

    return (
        <div className="contact-form-card ph-no-capture ph-sensitive">
            <form id="contact-form" className="contact-form" aria-label="Contact QR Me" onSubmit={openEmail}>
                <fieldset className="contact-platform">
                    <legend>Platform <span className="contact-required">(required)</span></legend>
                    <div className="contact-platform-options">
                        {(['iOS', 'Android'] as const).map(platform => (
                            <label className="contact-platform-option" key={platform}>
                                <input type="radio" name="platform" value={platform}
                                    checked={feedback.platform === platform}
                                    onChange={() => updateField('platform', platform)} required />
                                <span>{platform}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="contact-message">
                    <label htmlFor={`${id}-message`}>Message <span className="contact-required">(required)</span></label>
                    <textarea id={`${id}-message`} name="message"
                        placeholder="Comments, compliments, questions, bugs, or anything else you’d like me to know!"
                        value={feedback.message} onChange={event => updateField('message', event.target.value)}
                        rows={3} required />
                </div>

                <details className="contact-device-info">
                    <summary>
                        <span>Device info</span>
                        <span className="contact-disclosure" aria-hidden="true" />
                    </summary>
                    <p className="contact-device-description">
                        This optional info is helpful for me when debugging any issues you might encounter.
                    </p>
                    <div className="contact-device-fields">
                        {deviceFields.map(([field, label, placeholder]) => (
                            <div className="contact-device-field" key={field}>
                                <label htmlFor={`${id}-${field}`}>{label}</label>
                                <input id={`${id}-${field}`} name={field} type="text" placeholder={placeholder}
                                    value={feedback[field]} onChange={event => updateField(field, event.target.value)}
                                    autoComplete="off" autoCapitalize="off" spellCheck={false}
                                    aria-describedby={field === 'supportId' ? `${id}-support-help` : undefined} />
                            </div>
                        ))}
                    </div>
                    <p className="contact-support-help" id={`${id}-support-help`}>
                        You can find this at the bottom of the &quot;Info&quot; page in QR Me
                    </p>
                </details>

                <div className="contact-send">
                    <button type="submit" disabled={!feedback.platform || !feedback.message.trim()} aria-describedby={`${id}-send-help`}>Send</button>
                    <p id={`${id}-send-help`} className="contact-send-help">
                        Email didn’t open? Reach out to <a href={`mailto:${SUPPORT_EMAIL}`} target="_blank">{SUPPORT_EMAIL}</a>
                    </p>
                </div>
            </form>
        </div>
    );
}
