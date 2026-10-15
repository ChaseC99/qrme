import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    contactTypes, contactVCard, downloadQr, emptyContact, emptyPostalAddress, qrFileName, qrMatrix, qrMeWebsite, qrPng, qrSvg,
    type AddressEntry, type ContactEntry, type ContactField, type ListKey, type PostalAddress, type TextListKey,
} from '../contact-qr';
import './ContactQrGenerator.css';

const icons = {
    briefcase: <><rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/></>,
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
    { key: 'department', label: 'Department', icon: 'briefcase' },
    { key: 'birthday', label: 'Birthday', icon: 'cake' },
    { key: 'note', label: 'Note', icon: 'note' },
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

function FittedLabel({ value }: { value: string }) {
    const container = useRef<HTMLSpanElement>(null);
    const text = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        let active = true;
        const fit = () => {
            if (!active || !container.current || !text.current) return;
            text.current.style.fontSize = '13px';
            const available = container.current.clientWidth;
            const natural = text.current.getBoundingClientRect().width;
            if (available && natural > available) text.current.style.fontSize = `${13 * available / natural}px`;
        };
        const observer = new ResizeObserver(fit);
        if (container.current) observer.observe(container.current);
        void document.fonts.ready.then(fit);
        fit();
        return () => { active = false; observer.disconnect(); };
    }, [value]);

    return <span className="cq-type-label" ref={container} aria-hidden="true"><span ref={text}>{value}</span></span>;
}

function TypeSelect({ kind, value, index, onChange }: { kind: ListKey; value: string; index: number; onChange: (value: string) => void }) {
    return <div className="cq-type cq-type-select">
        <Icon name={listMeta[kind].icon}/>
        <FittedLabel value={value}/>
        <span className="cq-select-chevron"><Icon name="chevron" size={12}/></span>
        <select aria-label={`${listMeta[kind].label} ${index + 1} type`} value={value} onChange={event => onChange(event.target.value)}>
            {contactTypes[kind].map(type => <option key={type}>{type}</option>)}
        </select>
    </div>;
}

function AddField({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
    return <button type="button" className="cq-add-field" onClick={onClick}>
        <span className="cq-add-circle"><Icon name="plus" size={16}/></span>
        <Icon name={icon} size={17}/><span>Add {label.toLowerCase()}</span>
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
        {onAdd && <button type="button" className="cq-add-row" onClick={onAdd} title={addLabel} aria-label={addLabel}><Icon name="plus"/></button>}
        <button type="button" className="cq-remove" onClick={onRemove} aria-label={`Remove ${meta.label.toLowerCase()} ${index + 1}`}><Icon name="close" size={14}/></button>
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

function LockedWebsite() {
    const tooltipId = useId();
    const [tooltipDismissed, setTooltipDismissed] = useState(false);

    return <div className="cq-list-row cq-locked-website" role="group" tabIndex={0}
        aria-label={`${qrMeWebsite.label} website, locked`} aria-describedby={tooltipId}
        data-tooltip-dismissed={tooltipDismissed}
        onMouseEnter={() => setTooltipDismissed(false)} onFocus={() => setTooltipDismissed(false)}
        onKeyDown={event => { if (event.key === 'Escape') setTooltipDismissed(true); }}>
        <div className="cq-type"><Icon name="link"/><FittedLabel value={qrMeWebsite.label}/></div>
        <input type="url" aria-label={`${qrMeWebsite.label} website`} value={qrMeWebsite.url.replace('https://', '')} disabled/>
        <span className="cq-locked-indicator"><Icon name="lock" size={14}/></span>
        <span id={tooltipId} className="cq-locked-tooltip" role="tooltip">
            Want a QR code without this link?<br />
            Create one in the <a href="/download">QR Me app</a>.
        </span>
    </div>;
}

export default function ContactQrGenerator() {
    const [contact, setContact] = useState(emptyContact);
    const [shownSingles, setShownSingles] = useState<SingleKey[]>([]);
    const [nameDetailsOpen, setNameDetailsOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const nextEntry = useRef(1);
    const newEntry = useRef<string | null>(null);
    const detailsId = useId();
    const payload = contactVCard(contact);
    const matrix = useMemo(() => qrMatrix(payload), [payload]);
    const svg = useMemo(() => matrix ? qrSvg(matrix) : '', [matrix]);
    const previewSvg = useMemo(() => matrix ? qrSvg(matrix, 300) : '', [matrix]);

    useEffect(() => () => clearTimeout(toastTimer.current), []);
    const flash = (message: string) => {
        clearTimeout(toastTimer.current);
        setToast(message);
        toastTimer.current = setTimeout(() => setToast(null), 1800);
    };
    const setField = (key: ContactField, value: string) => setContact(current => ({ ...current, [key]: value }));
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
        if (!matrix) return;
        const filename = qrFileName(contact);
        try {
            downloadQr(await qrPng(svg), `${filename}.png`);
            document.dispatchEvent(new CustomEvent('qr-code-created', { detail: { method: 'download_png' } }));
            flash('PNG downloaded');
        } catch { flash('Couldn’t render PNG'); }
    };
    const downloadSvg = () => {
        if (!matrix) return;
        downloadQr(new Blob([svg], { type: 'image/svg+xml' }), `${qrFileName(contact)}.svg`);
        document.dispatchEvent(new CustomEvent('qr-code-created', { detail: { method: 'download_svg' } }));
        flash('SVG downloaded');
    };
    const copyImage = async () => {
        if (!matrix) return;
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
                    <p className="cq-eyebrow">Free contact QR generator</p>
                    <h1 id="contact-qr-heading">Create your QR code</h1>
                    <p className="cq-subtitle">
                        Make it easy for people to save your contact details.<br />
                        Create your QR code here, or <a href="https://qrme.contact/download">download the app</a> to have it ready wherever you go.
                    </p>
                </header>
                <form className="cq-form" autoComplete="off" onSubmit={event => event.preventDefault()}>
                    <div className="cq-columns">
                        <div>
                            <h2 className="cq-column-heading">About you</h2>
                            <div className="cq-stack">
                                <div className="cq-name-row">
                                    {field('first', 'First name')}{field('last', 'Last name')}
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
                                {field('company', 'Company')}
                                {field('title', 'Job title')}
                                {singles.map(({ key, label, icon }) => shownSingles.includes(key)
                                    ? <Field key={key} label={label} value={contact[key]} onChange={value => setField(key, value)} autoFocus
                                        type={key === 'birthday' ? 'date' : 'text'} placeholder={key === 'note' ? 'Anything else people should know' : undefined}
                                        onRemove={() => removeSingle(key)}/>
                                    : <AddField key={key} label={label} icon={icon} onClick={() => setShownSingles(current => [...current, key])}/>
                                )}
                            </div>
                        </div>
                        <div>
                            <h2 className="cq-column-heading">How to reach you</h2>
                            <div className="cq-stack">
                                {listKeys.map(key => <Fragment key={key}>
                                    {contact[key].map((entry, index) =>
                                        <ListRow key={entry.id} kind={key} entry={entry} index={index} autoFocus={entry.id === newEntry.current}
                                            onChange={patch => setContact(current => ({ ...current, [key]: current[key].map(row => row.id === entry.id ? { ...row, ...patch } : row) }))}
                                            onRemove={() => setContact(current => ({ ...current, [key]: current[key].filter(row => row.id !== entry.id) }))}
                                            onAdd={index === contact[key].length - 1 ? () => addRow(key) : undefined}/>
                                    )}
                                    {!contact[key].length && <AddField label={listMeta[key].label} icon={listMeta[key].icon} onClick={() => addRow(key)}/>}
                                    {key === 'websites' && <LockedWebsite/>}
                                </Fragment>)}
                                {contact.addresses.map((entry, index) => <AddressRow key={entry.id} entry={entry} index={index} autoFocus={entry.id === newEntry.current}
                                    onChange={patch => setContact(current => ({ ...current, addresses: current.addresses.map(row => row.id === entry.id ? { ...row, ...patch } : row) }))}
                                    onRemove={() => setContact(current => ({ ...current, addresses: current.addresses.filter(row => row.id !== entry.id) }))}
                                    onAdd={index === contact.addresses.length - 1 ? addAddress : undefined}/>
                                )}
                                {!contact.addresses.length && <AddField label="Address" icon="pin" onClick={addAddress}/>}
                            </div>
                        </div>
                    </div>
                </form>
                <p className="cq-privacy"><Icon name="lock"/>Made in your browser. No contact information is saved.</p>
            </div>
            <div className="cq-preview-spotlight">
                <aside className="cq-preview" aria-label="Contact QR code and downloads">
                    {matrix ? <div className="cq-code" role="img" aria-label="Your contact QR code" dangerouslySetInnerHTML={{ __html: previewSvg }}/>
                        : <div className="cq-code cq-error" role="status">Too much info for one code — trim the note or a field.</div>}
                    <div className="cq-exports">
                        <button type="button" className="cq-export cq-primary" disabled={!matrix} onClick={downloadPng}><Icon name="download" size={19}/>Download PNG</button>
                        <div className="cq-secondary-row">
                            <button type="button" className="cq-export cq-secondary" disabled={!matrix} onClick={downloadSvg}><Icon name="download" size={16}/>SVG</button>
                            <button type="button" className="cq-export cq-secondary" disabled={!matrix} onClick={copyImage}><Icon name="copy" size={16}/>Copy image</button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
        <div className={`cq-toast${toast ? ' cq-toast-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">{toast}</div>
    </section>;
}
