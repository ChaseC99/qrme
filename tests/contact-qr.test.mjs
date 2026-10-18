import assert from 'node:assert/strict';
import test from 'node:test';
import { contactVCard, emptyContact, emptyPostalAddress, hasContactDetails, qrFileName, qrMatrix, qrSvg } from '../src/contact-qr.ts';

test('an empty or whitespace-only contact returns to the sample regardless of row labels', () => {
    assert.equal(hasContactDetails(emptyContact()), false);
    const contact = {
        ...emptyContact(), first: '  ', note: '\n\t',
        phones: [{ id: 'new-phone', type: 'Work', value: ' ' }],
        addresses: [{ id: 'new-address', type: 'Work', value: { ...emptyPostalAddress(), city: '  ' } }],
    };
    assert.equal(hasContactDetails(contact), false);
    assert.equal(hasContactDetails({ ...contact, phones: [], emails: [], websites: [], addresses: [] }), false);
});

test('unnamed contacts with an email, an address component, or an optional detail are not samples', () => {
    for (const patch of [
        { emails: [{ id: 'email', type: 'Work', value: 'jane@example.com' }] },
        { addresses: [{ id: 'address', type: 'Home', value: { ...emptyPostalAddress(), postalCode: '94103' } }] },
        { department: 'Design' }, { birthday: '1990-01-02' }, { phFirst: 'Al-ex' }, { note: 'Hello' },
    ]) {
        assert.equal(hasContactDetails({ ...emptyContact(), ...patch }), true);
    }
});

test('clearing the last value or removing its row restores the empty-contact state', () => {
    const contact = emptyContact();
    contact.phones[0].value = '555-0123';
    assert.equal(hasContactDetails(contact), true);
    contact.phones[0].value = '';
    assert.equal(hasContactDetails(contact), false);
    contact.phones[0].value = '555-0123';
    contact.phones = [];
    assert.equal(hasContactDetails(contact), false);
});

test('an empty contact contains the included website without example data or empty contact methods', () => {
    assert.equal(contactVCard(emptyContact()), 'BEGIN:VCARD\nVERSION:3.0\nN:;;;;\nFN:\nURL;type=Get QR Me:https://qrme.contact/download\nEND:VCARD');
});

test('the included website survives removing or replacing every editable website', () => {
    for (const websites of [[], [{ type: 'Portfolio', value: 'https://example.com' }]]) {
        const payload = contactVCard({ ...emptyContact(), websites });
        assert.equal(payload.split('https://qrme.contact/download').length - 1, 1);
        assert.ok(payload.includes('URL;type=Get QR Me:https://qrme.contact/download'));
        if (websites.length) assert.ok(payload.includes('URL;type=Portfolio:https://example.com'));
    }
});

test('vCard exports structured names, optional fields, and repeated typed contact methods', () => {
    const contact = {
        ...emptyContact(), first: 'Zoë', last: '李', middle: 'Alex', prefix: 'Dr.', suffix: 'PhD',
        maiden: 'Smith', nickname: 'Z', phFirst: 'Zo-ee', phMiddle: 'Al-ex', phLast: 'Lee',
        company: 'Example', department: 'Research', title: 'Engineer', birthday: '1990-01-02', note: 'Hello',
        phones: [{ type: 'Mobile', value: '+1 555 0100' }, { type: 'Work', value: '+1 555 0101' }, { type: 'Home', value: '  ' }],
        emails: [{ type: 'Work', value: 'zoe@example.com' }],
        websites: [{ type: 'Portfolio', value: 'https://example.com' }],
        addresses: [{ type: 'Home', value: { street: '10 Main St', city: 'Town', state: 'MA', postalCode: '02110', country: 'USA' } }],
    };
    assert.deepEqual(contactVCard(contact).split('\n'), [
        'BEGIN:VCARD', 'VERSION:3.0', 'N:李;Zoë;Alex;Dr.;PhD', 'FN:Dr. Zoë Alex 李 PhD',
        'NICKNAME:Z', 'X-MAIDENNAME:Smith', 'X-PHONETIC-FIRST-NAME:Zo-ee',
        'X-PHONETIC-MIDDLE-NAME:Al-ex', 'X-PHONETIC-LAST-NAME:Lee',
        'ORG:Example;Research', 'TITLE:Engineer', 'TEL;TYPE=MOBILE:+1 555 0100',
        'TEL;TYPE=WORK:+1 555 0101', 'EMAIL;TYPE=WORK:zoe@example.com',
        'URL;type=Portfolio:https://example.com',
        'URL;type=Get QR Me:https://qrme.contact/download',
        'ADR;TYPE=HOME:;;10 Main St;Town;MA;02110;USA',
        'BDAY:1990-01-02', 'NOTE:Hello', 'END:VCARD',
    ]);
});

test('vCard escapes delimiters and line endings without injecting additional properties', () => {
    const contact = {
        ...emptyContact(), first: 'A;B,C\\D', note: 'One\r\nTwo\rThree\nFour',
        company: 'Company; Ltd', department: 'R,D',
        addresses: [{ type: 'Home', value: { ...emptyPostalAddress(), street: 'Street; Suite, City\\Region\nCountry' } }],
        phones: [{ type: 'Work\nNOTE', value: '555\nNOTE:injected' }],
    };
    const lines = contactVCard(contact).split('\n');
    assert.ok(lines.includes('N:;A\\;B\\,C\\\\D;;;'));
    assert.ok(lines.includes('ORG:Company\\; Ltd;R\\,D'));
    assert.ok(lines.includes('NOTE:One\\nTwo\\nThree\\nFour'));
    assert.ok(lines.includes('ADR;TYPE=HOME:;;Street\\; Suite\\, City\\\\Region\\nCountry;;;;'));
    assert.ok(lines.includes('TEL;TYPE=WORKNOTE:555\\nNOTE:injected'));
    assert.equal(lines.filter(line => line.startsWith('NOTE:')).length, 1);
});

test('addresses preserve separate components, repeated entries, and missing fields', () => {
    const payload = contactVCard({ ...emptyContact(), addresses: [
        { type: 'Home', value: { street: '10 Main St; Apt 2', city: 'Washington, DC', state: 'DC', postalCode: '20001', country: 'USA' } },
        { type: 'Work', value: { ...emptyPostalAddress(), city: 'Montréal' } },
        { type: 'Other', value: { ...emptyPostalAddress(), street: '  ' } },
    ] });
    assert.deepEqual(payload.split('\n').filter(line => line.startsWith('ADR;')), [
        'ADR;TYPE=HOME:;;10 Main St\\; Apt 2;Washington\\, DC;DC;20001;USA',
        'ADR;TYPE=WORK:;;;Montréal;;;',
    ]);
    assert.ok(!contactVCard(emptyContact()).includes('ADR;'));
});

test('website URIs retain reserved punctuation and percent escapes without injecting properties', () => {
    const url = 'https://example.com/a;b?tags=x,y&next=%2Fhello%20world#section';
    const payload = contactVCard({ ...emptyContact(), websites: [
        { type: 'Homepage', value: `  ${url}  ` },
        { type: 'Work', value: 'https://example.com/a b\r\nNOTE:injected' },
    ] });
    assert.ok(payload.includes(`URL;type=Homepage:${url}\n`));
    assert.ok(payload.includes('URL;type=Work:https://example.com/a%20b%0D%0ANOTE:injected\n'));
    assert.ok(!payload.split('\n').some(line => line.startsWith('NOTE:')));
    assert.ok(qrMatrix(payload));
});

test('website labels match Android type parameters and preserve Homepage casing', () => {
    const contact = emptyContact();
    assert.equal(contact.websites[0].type, 'Homepage');
    contact.websites = [
        { id: 'one', type: 'Homepage', value: 'https://example.com' },
        { id: 'two', type: 'Portfolio', value: 'https://portfolio.example.com' },
    ];
    const lines = contactVCard(contact).split('\n');
    assert.deepEqual(lines.filter(line => line.startsWith('URL;')), [
        'URL;type=Homepage:https://example.com',
        'URL;type=Portfolio:https://portfolio.example.com',
        'URL;type=Get QR Me:https://qrme.contact/download',
    ]);
    assert.ok(!lines.some(line => /^item\d+\./.test(line) || line.includes('X-ABLabel')));
    assert.ok(!lines.some(line => line.includes('HOMEPAGE') || line.includes('HomePage')));
});

test('company is the display name when there is no personal name', () => {
    assert.match(contactVCard({ ...emptyContact(), company: 'Example, Inc.' }), /\nFN:Example\\, Inc\.\n/);
    assert.match(contactVCard({ ...emptyContact(), department: 'Research' }), /\nORG:;Research\n/);
});

test('export filenames are safe and fall back when names cannot form a slug', () => {
    assert.equal(qrFileName({ first: 'Jane', last: 'Doe' }), 'qrme-jane-doe');
    assert.equal(qrFileName({ first: '../../Jane', last: 'O’Neil!' }), 'qrme-jane-oneil');
    assert.equal(qrFileName({ first: '李', last: '王' }), 'qrme-contact');
    assert.equal(qrFileName({ first: '', last: '' }), 'qrme-contact');
});

test('QR export has a four-module quiet zone, a vector viewBox, and a 1024px canvas size', () => {
    const matrix = qrMatrix(contactVCard({ ...emptyContact(), first: 'Zoë', last: '李' }));
    assert.ok(matrix);
    const size = matrix.length;
    assert.ok(matrix.every(row => row.length === size));
    const svg = qrSvg(matrix);
    assert.ok(svg.includes(`viewBox="0 0 ${size + 8} ${size + 8}"`));
    assert.ok(svg.includes('width="1024" height="1024"'));
    assert.ok(svg.includes('shape-rendering="crispEdges"'));
    for (const match of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
        assert.ok(+match[1] >= 4 && +match[1] < size + 4);
        assert.ok(+match[2] >= 4 && +match[2] < size + 4);
    }
});

test('overflow reports an unavailable code and encoding recovers after trimming', () => {
    assert.equal(qrMatrix(contactVCard({ ...emptyContact(), note: 'x'.repeat(4000) })), null);
    assert.ok(qrMatrix(contactVCard({ ...emptyContact(), note: 'Short note' })));
});
