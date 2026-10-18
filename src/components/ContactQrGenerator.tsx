import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import AppDownloadDialog from './AppDownloadDialog';
import { DESKTOP_QR_MEDIA } from '../constants';
import {
    contactTypes, contactVCard, downloadQr, emptyContact, emptyPostalAddress, hasContactDetails, qrFileName, qrMatrix, qrMeWebsite, qrPng, qrSvg,
    type AddressEntry, type Contact, type ContactEntry, type ContactField, type ListKey, type PostalAddress, type TextListKey,
} from '../contact-qr';
import './ContactQrGenerator.css';

const icons = {
    info: <><circle cx="12" cy="12" r="9"/><path d="M10 11h2v6m-2 0h4"/><circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none"/></>,
    edit: <path d="m4 16-1 5 5-1L19 9l-4-4L4 16Zm12-12 4 4 1-1a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0l-1 1Z" fill="currentColor" stroke="none"/>,
    person: <><circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    briefcase: <><rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/></>,
    department: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v3"/></>,
    phone: <path d="M6.6 4h3l1.4 3.5-2 1.4a11 11 0 0 0 5 5l1.4-2 3.5 1.4v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.6 6.2 2 2 0 0 1 6.6 4Z"/>,
    mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 5.5L19.5 7"/></>,
    link: <><path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 1 0-5-5L11.2 7.3"/><path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 1 0 5 5l1.3-1.3"/></>,
    pin: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></>,
    cake: <><path d="M4.5 20v-6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v6M3.5 20h17M12 12V8.5"/><circle cx="12" cy="6" r="1.2"/></>,
    note: <><rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/></>,
    download: <><path d="M12 4v11m-4.5-4 4.5 4.5 4.5-4.5M5 19h14"/></>,
    copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></>,
    plus: <path d="M12 6v12M6 12h12"/>,
    close: <path d="M7 7l10 10M17 7 7 17"/>,
    lock: <><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
};
type IconName = keyof typeof icons;

function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
    return <svg className="cq-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

const listKeys: TextListKey[] = ['phones', 'emails', 'websites'];
const listMeta: Record<ListKey, { label: string; icon: IconName; placeholder: string; inputType: string }> = {
    phones: { label: 'Phone', icon: 'phone', placeholder: '(555) 555-5555', inputType: 'tel' },
    emails: { label: 'Email', icon: 'mail', placeholder: 'you@email.com', inputType: 'email' },
    websites: { label: 'Website', icon: 'link', placeholder: 'yoursite.com', inputType: 'text' },
    addresses: { label: 'Address', icon: 'pin', placeholder: 'Street, City, State ZIP', inputType: 'text' },
};
const singles = [
    { key: 'title', label: 'Job title', icon: 'briefcase' },
    { key: 'department', label: 'Department', icon: 'department' },
    { key: 'note', label: 'Note', icon: 'note' },
    { key: 'birthday', label: 'Birthday', icon: 'cake' },
] as const;
type SingleKey = typeof singles[number]['key'];

function Field({ label, value, onChange, placeholder, type = 'text', onRemove, autoFocus = false, accessibleLabel }: {
    label: string; value: string; onChange: (value: string) => void; placeholder?: string;
    type?: string; onRemove?: () => void; autoFocus?: boolean; accessibleLabel?: string;
}) {
    return <div className="cq-field">
        <label>
            <span className="cq-field-label">{label}</span>
            <input type={type} value={value} placeholder={placeholder} autoComplete="off" autoFocus={autoFocus}
                aria-label={accessibleLabel} onChange={event => onChange(event.target.value)}/>
        </label>
        {onRemove && <button type="button" className="cq-remove" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()}`}><Icon name="close" size={14}/></button>}
    </div>;
}

function TypeSelect({ kind, value, index, onChange }: { kind: ListKey; value: string; index: number; onChange: (value: string) => void }) {
    return <div className="cq-type cq-type-select">
        <Icon name={listMeta[kind].icon}/>
        <span className="cq-type-label" aria-hidden="true">{value}</span>
        <span className="cq-select-chevron"><Icon name="chevron" size={12}/></span>
        <select aria-label={`${listMeta[kind].label} ${index + 1} type`} value={value} onChange={event => onChange(event.target.value)}>
            {contactTypes[kind].map(type => <option key={type}>{type}</option>)}
        </select>
    </div>;
}

function AddField({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
    return <button type="button" className="cq-add-field" aria-label={`Add ${label.toLowerCase()}`} onClick={onClick}>
        <Icon name={icon} size={14}/><span>{label}</span>
    </button>;
}

function ListRow({ kind, entry, index, onChange, onRemove, onAdd, autoFocus }: {
    kind: TextListKey; entry: ContactEntry; index: number; onChange: (patch: Partial<ContactEntry>) => void;
    onRemove: () => void; onAdd?: () => void; autoFocus: boolean;
}) {
    const meta = listMeta[kind];
    const addLabel = `Add another ${meta.label.toLowerCase()}`;
    return <div className="cq-list-row">
        <TypeSelect kind={kind} value={entry.type} index={index} onChange={type => onChange({ type })}/>
        <input type={meta.inputType} aria-label={`${meta.label} ${index + 1}`} value={entry.value}
            placeholder={meta.placeholder} autoComplete="off" autoFocus={autoFocus}
            onChange={event => onChange({ value: event.target.value })}/>
        <div className="cq-row-actions">
            {onAdd && <button type="button" className="cq-add-row" onClick={onAdd} title={addLabel} aria-label={addLabel}><Icon name="plus"/></button>}
            <button type="button" className="cq-remove" onClick={onRemove} aria-label={`Remove ${meta.label.toLowerCase()} ${index + 1}`}><Icon name="close" size={14}/></button>
        </div>
    </div>;
}

function AddressRow({ entry, index, onChange, onRemove, onAdd, autoFocus }: {
    entry: AddressEntry; index: number; onChange: (patch: Partial<AddressEntry>) => void;
    onRemove: () => void; onAdd?: () => void; autoFocus: boolean;
}) {
    const addressField = (key: keyof PostalAddress, label: string) => <Field label={label} value={entry.value[key]}
        accessibleLabel={`Address ${index + 1} ${label.toLowerCase()}`} autoFocus={autoFocus && key === 'street'}
        onChange={value => onChange({ value: { ...entry.value, [key]: value } })}/>;

    return <div className="cq-address" role="group" aria-label={`Address ${index + 1}`}>
        <div className="cq-address-heading">
            <TypeSelect kind="addresses" value={entry.type} index={index} onChange={type => onChange({ type })}/>
            <div className="cq-address-actions">
                {onAdd && <button type="button" className="cq-add-row" onClick={onAdd} title="Add another address" aria-label="Add another address"><Icon name="plus"/></button>}
                <button type="button" className="cq-remove" onClick={onRemove} aria-label={`Remove address ${index + 1}`}><Icon name="close" size={14}/></button>
            </div>
        </div>
        <div className="cq-address-fields cq-stack">
            {addressField('street', 'Street')}
            <div className="cq-pair">{addressField('city', 'City')}{addressField('state', 'State / region')}</div>
            <div className="cq-pair">{addressField('postalCode', 'Postal code')}{addressField('country', 'Country')}</div>
        </div>
    </div>;
}

function LockedWebsite({ onOpenApp }: { onOpenApp: () => void }) {
    const row = useRef<HTMLDivElement>(null);
    const tooltipId = useId();
    const [tooltipDismissed, setTooltipDismissed] = useState(false);

    return <div ref={row} className="cq-list-row cq-locked-website" role="group" tabIndex={0}
        aria-label={`${qrMeWebsite.label} website, locked`} aria-describedby={tooltipId}
        data-tooltip-dismissed={tooltipDismissed}
        onMouseEnter={() => setTooltipDismissed(false)} onFocus={() => setTooltipDismissed(false)}
        onKeyDown={event => { if (event.key === 'Escape') setTooltipDismissed(true); }}>
        <div className="cq-type"><Icon name="link"/><span className="cq-type-label" aria-hidden="true">{qrMeWebsite.label}</span></div>
        <input type="url" aria-label={`${qrMeWebsite.label} website`} value={qrMeWebsite.url.replace('https://', '')} disabled/>
        <span className="cq-locked-indicator"><Icon name="lock" size={14}/></span>
        <span id={tooltipId} className="cq-locked-tooltip" role="tooltip">
            Want a QR code without this link?<br />
            Create one in the <button type="button" aria-haspopup="dialog" onClick={() => {
                // The tooltip hides on blur, so return dialog focus to its visible row.
                row.current?.focus({ preventScroll: true });
                onOpenApp();
            }}>QR Me app</button>.
        </span>
    </div>;
}

const sampleContact: Contact = {
    ...emptyContact(), first: 'Jane', last: 'Appleseed', company: 'Studio North', title: 'Designer',
    phones: [{ id: 'sample-phone', type: 'Mobile', value: '(415) 555-0123' }],
    emails: [{ id: 'sample-email', type: 'Work', value: 'jane@example.com' }],
    websites: [{ id: 'sample-website', type: 'Portfolio', value: 'example.com' }],
};

function PreviewRow({ icon, label, value, field }: { icon: IconName; label?: string; value: string; field?: string }) {
    if (!value.trim()) return null;
    return <div className="cq-contact-row" data-preview-field={field}>
        <Icon name={icon} size={15}/>
        <div>{label && <span className="cq-contact-label">{label}</span>}<span className="cq-contact-value">{value}</span></div>
    </div>;
}

function ContactPhone({ contact, svg, activeField, onInfo, onEdit, formId }: {
    contact: Contact; svg: string; activeField: string | null; onInfo: () => void; onEdit: () => void; formId: string;
}) {
    const details = useRef<HTMLDivElement>(null);
    const fullName = [contact.prefix, contact.first, contact.middle, contact.last, contact.suffix].filter(Boolean).join(' ');
    const pronunciation = [contact.phFirst, contact.phMiddle, contact.phLast].filter(Boolean).join(' ');

    useEffect(() => {
        const container = details.current;
        if (container && !activeField) {
            container.scrollTop = 0;
            return;
        }
        const row = container && Array.from(container.querySelectorAll<HTMLElement>('[data-preview-field]'))
            .find(element => element.dataset.previewField === activeField);
        if (!container || !row) return;
        // Follow the edited field inside the phone without moving the page or
        // the user's cursor in the form.
        const bounds = container.getBoundingClientRect();
        const item = row.getBoundingClientRect();
        if (item.height > bounds.height || item.top < bounds.top) container.scrollTop += item.top - bounds.top - 8;
        else if (item.bottom > bounds.bottom) container.scrollTop += item.bottom - bounds.bottom + 8;
    }, [contact, activeField]);

    return <div className="cq-phone">
        <div className="cq-phone-screen">
            <div className="cq-phone-header">
                <div className="cq-phone-status" aria-hidden="true">
                    <span>9:41</span>
                    <span className="cq-phone-island"/>
                    <svg width="54" height="14" viewBox="0 0 68 16" fill="currentColor">
                        <rect x="0" y="10" width="3" height="5" rx="1"/><rect x="5" y="7" width="3" height="8" rx="1"/><rect x="10" y="4" width="3" height="11" rx="1"/><rect x="15" y="1" width="3" height="14" rx="1" fill="#ccc"/>
                        <path d="M25 5q9-8 18 0M28 9q6-5 12 0" fill="none" stroke="currentColor" strokeWidth="2.6"/><path d="M31 12q3-3 6 0l-3 3z"/>
                        <rect x="49" y="2" width="16" height="12" rx="4" fill="none" stroke="#999" strokeWidth="1.4"/><rect x="51" y="4" width="11" height="8" rx="2"/><path d="M67 6v4" stroke="#999" strokeWidth="1.4"/>
                    </svg>
                </div>
                <div className="cq-phone-nav">
                    <button type="button" className="cq-phone-control" aria-label="About the QR Me app" aria-haspopup="dialog" title="About QR Me" onClick={onInfo}><Icon name="info" size={18}/></button>
                    <strong>QR Me - Contact</strong>
                    <button type="button" className="cq-phone-control" aria-label="Edit contact" aria-controls={formId} title="Edit contact" onClick={onEdit}><Icon name="edit" size={18}/></button>
                </div>
            </div>
            {svg ? <div className="cq-code" role="img" aria-label="Your contact QR code" dangerouslySetInnerHTML={{ __html: svg }}/>
                : <div className="cq-code cq-error" role="status">Too much info for one code — trim the note or a field.</div>}
            <div className="cq-contact-details" ref={details} role="region" aria-label="Contact details in the phone preview" tabIndex={0}>
                <PreviewRow icon="person" field="name" value={fullName}/>
                <PreviewRow icon="person" field="pronunciation" label="Pronunciation" value={pronunciation}/>
                <PreviewRow icon="person" field="nickname" label="Nickname" value={contact.nickname}/>
                <PreviewRow icon="person" field="maiden" label="Maiden name" value={contact.maiden}/>
                <PreviewRow icon="briefcase" field="organization" value={[contact.title, contact.company, contact.department].filter(Boolean).join('\n')}/>
                {listKeys.map(key => contact[key].map(entry => <PreviewRow key={entry.id} field={entry.id} icon={listMeta[key].icon} label={entry.type} value={entry.value}/>))}
                <PreviewRow icon="link" label={qrMeWebsite.label} value={qrMeWebsite.url.replace('https://', '')}/>
                {contact.addresses.map(entry => <PreviewRow key={entry.id} field={entry.id} icon="pin" label={`${entry.type} address`}
                    value={[entry.value.street, [entry.value.city, entry.value.state, entry.value.postalCode].filter(Boolean).join(', '), entry.value.country].filter(Boolean).join('\n')}/>)}
                <PreviewRow icon="cake" field="birthday" label="Birthday" value={contact.birthday}/>
                <PreviewRow icon="note" field="note" label="Note" value={contact.note}/>
            </div>
        </div>
    </div>;
}

function AppDownloadCta({ onClick }: { onClick: () => void }) {
    return <button type="button" className="cq-app-card" aria-haspopup="dialog" onClick={onClick}>
        <img src="/logo.png" width="40" height="40" alt=""/>
        <span><strong>Keep this QR code on your phone</strong><span>Get the free QR Me app</span></span>
        <span className="cq-app-arrow" aria-hidden="true">→</span>
    </button>;
}

export default function ContactQrGenerator() {
    const [contact, setContact] = useState(emptyContact);
    const hasDetails = hasContactDetails(contact);
    const [activePreviewField, setActivePreviewField] = useState<string | null>(null);
    const [shownSingles, setShownSingles] = useState<SingleKey[]>([]);
    const [nameDetailsOpen, setNameDetailsOpen] = useState(false);
    const [exportTooltipDismissed, setExportTooltipDismissed] = useState(false);
    const [appDialogOpen, setAppDialogOpen] = useState(false);
    const [downloadPromptVisible, setDownloadPromptVisible] = useState(false);
    const downloadPromptShown = useRef(false);
    const appCard = useRef<HTMLDivElement>(null);
    const [formHighlighted, setFormHighlighted] = useState(false);
    const form = useRef<HTMLFormElement>(null);
    const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const nextEntry = useRef(1);
    const newEntry = useRef<string | null>(null);
    const detailsId = useId();
    const exportTooltipId = useId();
    const formId = useId();
    // Keep the sample out of editable state and exports, and restore it whenever
    // every editable value is empty (the included download link doesn't count).
    const previewContact = hasDetails ? contact : sampleContact;
    const payload = contactVCard(previewContact);
    const matrix = useMemo(() => qrMatrix(payload), [payload]);
    const svg = useMemo(() => matrix ? qrSvg(matrix) : '', [matrix]);

    useEffect(() => () => {
        clearTimeout(toastTimer.current);
        clearTimeout(highlightTimer.current);
    }, []);
    useEffect(() => {
        const desktop = window.matchMedia(DESKTOP_QR_MEDIA);
        const dismissDesktopOverlays = () => {
            if (desktop.matches) return;
            setAppDialogOpen(false);
            setDownloadPromptVisible(false);
            setToast(null);
        };
        dismissDesktopOverlays();
        desktop.addEventListener('change', dismissDesktopOverlays);
        return () => desktop.removeEventListener('change', dismissDesktopOverlays);
    }, []);
    const highlightForm = () => {
        clearTimeout(highlightTimer.current);
        setFormHighlighted(true);
        form.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        form.current?.querySelector('input')?.focus({ preventScroll: true });
        highlightTimer.current = setTimeout(() => setFormHighlighted(false), 1800);
    };
    const flash = (message: string) => {
        clearTimeout(toastTimer.current);
        setDownloadPromptVisible(false);
        setToast(message);
        toastTimer.current = setTimeout(() => setToast(null), 1800);
    };
    const dismissDownloadPrompt = () => {
        setDownloadPromptVisible(false);
        appCard.current?.querySelector('button')?.focus({ preventScroll: true });
    };
    const setField = (key: ContactField, value: string) => {
        setActivePreviewField(['first', 'middle', 'last', 'prefix', 'suffix'].includes(key) ? 'name'
            : ['title', 'department', 'company',].includes(key) ? 'organization'
            : ['phFirst', 'phMiddle', 'phLast'].includes(key) ? 'pronunciation' : key);
        setContact(current => ({ ...current, [key]: value }));
    };
    const addRow = (key: TextListKey) => {
        const id = `${key}-${nextEntry.current++}`;
        newEntry.current = id;
        setContact(current => ({ ...current, [key]: [...current[key], { id, type: contactTypes[key][0], value: '' }] }));
    };
    const addAddress = () => {
        const id = `address-${nextEntry.current++}`;
        newEntry.current = id;
        setContact(current => ({ ...current, addresses: [...current.addresses, { id, type: 'Home', value: emptyPostalAddress() }] }));
    };
    const removeSingle = (key: SingleKey) => {
        setField(key, '');
        setShownSingles(current => current.filter(field => field !== key));
    };
    const field = (key: ContactField, label: string, placeholder?: string, accessibleLabel?: string) =>
        <Field label={label} value={contact[key]} onChange={value => setField(key, value)} placeholder={placeholder} accessibleLabel={accessibleLabel}/>;
    const nameSummary = [contact.prefix, contact.middle, contact.suffix,
        contact.nickname && `“${contact.nickname}”`, contact.maiden && `née ${contact.maiden}`,
        (contact.phFirst || contact.phMiddle || contact.phLast) && 'pronunciation'].filter(Boolean).join(' · ');

    const downloadPng = async () => {
        if (!matrix || !hasDetails) return;
        const filename = qrFileName(contact);
        try {
            downloadQr(await qrPng(svg), `${filename}.png`);
            document.dispatchEvent(new CustomEvent('qr-code-created', { detail: { method: 'download_png' } }));
            if (!downloadPromptShown.current) {
                downloadPromptShown.current = true;
                clearTimeout(toastTimer.current);
                setToast(null);
                setDownloadPromptVisible(true);
            } else flash('QR code downloaded');
        } catch { flash('Couldn’t render PNG'); }
    };
    const copyImage = async () => {
        if (!matrix || !hasDetails) return;
        try {
            // Pass the promise immediately so Safari retains the click's user activation.
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': qrPng(svg) })]);
            document.dispatchEvent(new CustomEvent('qr-code-created', { detail: { method: 'copy_image' } }));
            flash('Copied to clipboard');
        } catch { flash('Clipboard blocked — try Download'); }
    };

    return <section id="contact-qr-generator" className="contact-qr-generator ph-no-capture" aria-labelledby="contact-qr-heading">
        <div className="cq-inner">
            <div className="cq-editor">
                <header className="cq-intro">
                    <h1 id="contact-qr-heading">Your contact,<br /><span className="cq-highlight">one scan away.</span></h1>
                    <p className="cq-subtitle">
                        Easily share your contact with a QR code that adds your details right into their Contacts app.
                    </p>
                </header>
                <p className="cq-privacy"><Icon name="lock"/>Made in your browser. No contact information is saved.</p>
                <form ref={form} id={formId} className={`cq-form${formHighlighted ? ' cq-form-highlighted' : ''}`} aria-label="Create your contact QR code" autoComplete="off" onSubmit={event => event.preventDefault()}>
                    <div className="cq-columns">
                        <div>
                            <div className="cq-stack">
                                <div className="cq-name-row">
                                    {field('first', 'First name', 'John')}{field('last', 'Last name', 'Appleseed')}
                                    <button type="button" className="cq-name-toggle" title="More name fields" aria-label="More name fields"
                                        aria-expanded={nameDetailsOpen} aria-controls={detailsId} onClick={() => setNameDetailsOpen(open => !open)}>
                                        <Icon name="chevron" size={16}/>
                                    </button>
                                </div>
                                <div id={detailsId} className="cq-name-details" hidden={!nameDetailsOpen}>
                                    <div className="cq-pair">{field('prefix', 'Prefix', 'Dr., Ms.')}{field('suffix', 'Suffix', 'Jr., PhD')}</div>
                                    <div className="cq-pair">{field('middle', 'Middle name')}{field('nickname', 'Nickname')}</div>
                                    {field('maiden', 'Maiden name')}
                                    <div className="cq-pronunciation">Pronunciation <span>— how to say your name</span></div>
                                    <div className="cq-phonetics">
                                        {field('phFirst', 'First', undefined, 'Phonetic first name')}
                                        {field('phMiddle', 'Middle', undefined, 'Phonetic middle name')}
                                        {field('phLast', 'Last', undefined, 'Phonetic last name')}
                                    </div>
                                </div>
                                {!nameDetailsOpen && nameSummary && <button type="button" className="cq-name-summary" onClick={() => setNameDetailsOpen(true)}>Also: {nameSummary}</button>}
                                {singles.filter(({ key }) => (key === 'title' || key === 'department') && shownSingles.includes(key)).map(({ key, label }) =>
                                    <Field key={key} label={label} value={contact[key]} onChange={value => setField(key, value)}
                                        autoFocus onRemove={() => removeSingle(key)}/>
                                )}
                                {field('company', 'Company', 'Where you work')}
                                {singles.filter(({ key }) => key !== 'title' && key !== 'department' && shownSingles.includes(key)).map(({ key, label }) =>
                                    <Field key={key} label={label} value={contact[key]} onChange={value => setField(key, value)} autoFocus
                                        type={key === 'birthday' ? 'date' : 'text'} placeholder={key === 'note' ? 'Anything else people should know' : undefined}
                                        onRemove={() => removeSingle(key)}/>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="cq-stack">
                                {listKeys.map(key => <Fragment key={key}>
                                    {contact[key].map((entry, index) =>
                                        <ListRow key={entry.id} kind={key} entry={entry} index={index} autoFocus={entry.id === newEntry.current}
                                            onChange={patch => {
                                                setActivePreviewField(entry.id);
                                                setContact(current => ({ ...current, [key]: current[key].map(row => row.id === entry.id ? { ...row, ...patch } : row) }));
                                            }}
                                            onRemove={() => setContact(current => ({ ...current, [key]: current[key].filter(row => row.id !== entry.id) }))}
                                            onAdd={index === contact[key].length - 1 ? () => addRow(key) : undefined}/>
                                    )}
                                    {key === 'websites' && <LockedWebsite onOpenApp={() => setAppDialogOpen(true)}/>}
                                </Fragment>)}
                                {contact.addresses.map((entry, index) => <AddressRow key={entry.id} entry={entry} index={index} autoFocus={entry.id === newEntry.current}
                                    onChange={patch => {
                                        setActivePreviewField(entry.id);
                                        setContact(current => ({ ...current, addresses: current.addresses.map(row => row.id === entry.id ? { ...row, ...patch } : row) }));
                                    }}
                                    onRemove={() => setContact(current => ({ ...current, addresses: current.addresses.filter(row => row.id !== entry.id) }))}
                                    onAdd={index === contact.addresses.length - 1 ? addAddress : undefined}/>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="cq-add-fields" role="group" aria-label="Add contact fields">
                        <h2 className="cq-add-fields-label">Add more</h2>
                        {listKeys.filter(key => !contact[key].length).map(key => <AddField key={key} label={listMeta[key].label} icon={listMeta[key].icon} onClick={() => addRow(key)}/>)}
                        {singles.filter(({ key }) => key !== 'birthday' && !shownSingles.includes(key)).map(({ key, label, icon }) =>
                            <AddField key={key} label={label} icon={icon} onClick={() => setShownSingles(current => [...current, key])}/>
                        )}
                        {!contact.addresses.length && <AddField label="Address" icon="pin" onClick={addAddress}/>}
                        {!shownSingles.includes('birthday') && <AddField label="Birthday" icon="cake" onClick={() => setShownSingles(current => [...current, 'birthday'])}/>}
                    </div>
                </form>
            </div>
            <div className="cq-preview-spotlight">
                <aside className="cq-preview" aria-label="Contact QR code and downloads">
                    <ContactPhone contact={previewContact} svg={svg} activeField={hasDetails ? activePreviewField : null}
                        onInfo={() => setAppDialogOpen(true)} onEdit={highlightForm} formId={formId}/>
                    <div className="cq-exports" role="group" aria-label="QR code exports"
                        tabIndex={!hasDetails ? 0 : undefined} aria-describedby={!hasDetails ? exportTooltipId : undefined}
                        data-tooltip-dismissed={exportTooltipDismissed}
                        onMouseEnter={() => setExportTooltipDismissed(false)} onFocus={() => setExportTooltipDismissed(false)}
                        onKeyDown={event => { if (event.key === 'Escape') setExportTooltipDismissed(true); }}>
                        <button type="button" className="cq-export cq-primary" disabled={!matrix || !hasDetails} onClick={downloadPng}><Icon name="download" size={18}/>Download QR code</button>
                        <button type="button" className="cq-export cq-secondary" disabled={!matrix || !hasDetails} onClick={copyImage}><Icon name="copy" size={16}/>Copy</button>
                        {!hasDetails && <span id={exportTooltipId} className="cq-export-tooltip" role="tooltip">Add your details to download your QR code.</span>}
                    </div>
                </aside>
                <div className="cq-app-card-slot" ref={appCard}><AppDownloadCta onClick={() => setAppDialogOpen(true)}/></div>
            </div>
        </div>
        <div role="status" aria-live="polite" aria-atomic="true">
            {downloadPromptVisible && <aside className="cq-download-prompt" aria-label="QR code downloaded"
                onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); dismissDownloadPrompt(); } }}>
                <button type="button" className="cq-prompt-close" aria-label="Dismiss app suggestion" onClick={dismissDownloadPrompt}><Icon name="close" size={18}/></button>
                <p className="cq-download-success"><Icon name="download" size={16}/>QR code downloaded</p>
                <AppDownloadCta onClick={() => setAppDialogOpen(true)}/>
            </aside>}
        </div>
        <AppDownloadDialog open={appDialogOpen} onClose={() => setAppDialogOpen(false)}/>
        <div className={`cq-toast${toast ? ' cq-toast-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">{toast}</div>
    </section>;
}
