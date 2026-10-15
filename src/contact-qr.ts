import qrcode from 'qrcode-generator';

export const contactTypes = {
    phones: ['Mobile', 'Home', 'Work', 'School', 'Other'],
    emails: ['Home', 'Work', 'School', 'Other'],
    websites: ['Homepage', 'Work', 'Blog', 'Portfolio', 'Other'],
    addresses: ['Home', 'Work', 'Other'],
} as const;

export const qrMeWebsite = { label: 'Get QR Me', url: 'https://qrme.contact/download' } as const;

export type ListKey = keyof typeof contactTypes;
export type TextListKey = Exclude<ListKey, 'addresses'>;
export type ContactEntry = { id: string; type: string; value: string };
export type PostalAddress = { street: string; city: string; state: string; postalCode: string; country: string };
export type AddressEntry = { id: string; type: string; value: PostalAddress };
export type ContactField =
    | 'first' | 'last' | 'prefix' | 'middle' | 'suffix' | 'maiden' | 'nickname'
    | 'phFirst' | 'phMiddle' | 'phLast' | 'title' | 'company' | 'department'
    | 'birthday' | 'note';
export type Contact = Record<ContactField, string> & Record<TextListKey, ContactEntry[]> & { addresses: AddressEntry[] };
export type QrMatrix = boolean[][];

export function emptyPostalAddress(): PostalAddress {
    return { street: '', city: '', state: '', postalCode: '', country: '' };
}

export function emptyContact(): Contact {
    return {
        first: '', last: '', prefix: '', middle: '', suffix: '', maiden: '', nickname: '',
        phFirst: '', phMiddle: '', phLast: '', title: '', company: '', department: '',
        birthday: '', note: '',
        phones: [{ id: 'phone-0', type: 'Mobile', value: '' }],
        emails: [{ id: 'email-0', type: 'Home', value: '' }],
        websites: [{ id: 'website-0', type: 'Homepage', value: '' }],
        addresses: [],
    };
}

const escapeText = (value: string) => value.replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

// Preserve URI punctuation and existing percent escapes. Encode whitespace and
// control characters so a pasted URL cannot introduce another vCard property.
const escapeUri = (value: string) => value.trim().replace(/[\u0000-\u0020\u007f\\]/g, character => encodeURIComponent(character));

export function contactVCard(contact: Contact): string {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    lines.push(`N:${[contact.last, contact.first, contact.middle, contact.prefix, contact.suffix].map(escapeText).join(';')}`);
    const name = [contact.prefix, contact.first, contact.middle, contact.last, contact.suffix].filter(Boolean).join(' ');
    lines.push(`FN:${escapeText(name || contact.company)}`);
    const nameFields = {
        nickname: 'NICKNAME', maiden: 'X-MAIDENNAME', phFirst: 'X-PHONETIC-FIRST-NAME',
        phMiddle: 'X-PHONETIC-MIDDLE-NAME', phLast: 'X-PHONETIC-LAST-NAME',
    } as const;
    for (const [field, property] of Object.entries(nameFields)) {
        const value = contact[field as keyof typeof nameFields];
        if (value) lines.push(`${property}:${escapeText(value)}`);
    }
    if (contact.company || contact.department) lines.push(`ORG:${escapeText(contact.company)};${escapeText(contact.department)}`);
    if (contact.title) lines.push(`TITLE:${escapeText(contact.title)}`);
    const properties = { phones: 'TEL', emails: 'EMAIL', websites: 'URL' } as const;
    for (const key of Object.keys(properties) as TextListKey[]) {
        for (const entry of contact[key]) {
            if (!entry.value.trim()) continue;
            if (key === 'websites') {
                const label = entry.type === 'HomePage' ? 'Homepage' : entry.type;
                const type = label.replace(/[^A-Za-z ]/g, '');
                lines.push(`URL;type=${type}:${escapeUri(entry.value)}`);
                continue;
            }
            const type = entry.type.toUpperCase().replace(/[^A-Z]/g, '');
            lines.push(`${properties[key]};TYPE=${type}:${escapeText(entry.value)}`);
        }
    }
    // Keep the included website outside editable contact state.
    lines.push(`URL;type=${qrMeWebsite.label}:${qrMeWebsite.url}`);
    for (const entry of contact.addresses) {
        const { street, city, state, postalCode, country } = entry.value;
        const components = ['', '', street, city, state, postalCode, country];
        if (!components.some(value => value.trim())) continue;
        const type = entry.type.toUpperCase().replace(/[^A-Z]/g, '');
        lines.push(`ADR;TYPE=${type}:${components.map(escapeText).join(';')}`);
    }
    if (contact.birthday) lines.push(`BDAY:${contact.birthday}`);
    if (contact.note) lines.push(`NOTE:${escapeText(contact.note)}`);
    lines.push('END:VCARD');
    return lines.join('\n');
}

export function qrMatrix(payload: string): QrMatrix | null {
    // qrcode-generator defaults to Latin-1. Keep this override local to encoding
    // so other QR components retain their own encoder configuration.
    const originalEncoder = qrcode.stringToBytes;
    try {
        qrcode.stringToBytes = value => Array.from(new TextEncoder().encode(value));
        const qr = qrcode(0, 'M');
        qr.addData(payload, 'Byte');
        qr.make();
        const size = qr.getModuleCount();
        return Array.from({ length: size }, (_, row) =>
            Array.from({ length: size }, (_, column) => qr.isDark(row, column)));
    } catch {
        return null;
    } finally {
        qrcode.stringToBytes = originalEncoder;
    }
}

export function qrSvg(matrix: QrMatrix, pixels = 1024): string {
    const quietZone = 4;
    const size = matrix.length + quietZone * 2;
    let path = '';
    matrix.forEach((row, y) => row.forEach((dark, x) => {
        if (dark) path += `M${x + quietZone} ${y + quietZone}h1v1h-1z`;
    }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${pixels}" height="${pixels}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#111111"/></svg>`;
}

export function qrFileName(contact: Pick<Contact, 'first' | 'last'>): string {
    const name = [contact.first, contact.last].filter(Boolean).join('-').toLowerCase()
        .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `qrme-${name || 'contact'}`;
}

export function qrPng(svg: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 1024;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Canvas unavailable');
                context.drawImage(image, 0, 0, 1024, 1024);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png');
            } catch (error) { reject(error); }
        };
        image.onerror = () => reject(new Error('SVG unavailable'));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}

export function downloadQr(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    // Exclude the temporary download link from the site's analytics, too.
    link.className = 'ph-no-capture';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
