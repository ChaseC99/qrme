import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { buildSync } from 'esbuild';

const source = buildSync({
    entryPoints: [fileURLToPath(new URL('../src/contact-feedback.ts', import.meta.url))],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
}).outputFiles[0].text;
const context = { module: { exports: {} }, URLSearchParams };
runInNewContext(source, context);
const { feedbackFromSearch, feedbackMailto } = context.module.exports;

test('app links prefill both platforms and all optional device fields', () => {
    const query = new URLSearchParams({
        platform: 'android', device: 'Pixel 10', os_version: 'Android 16',
        qrme_version: '4.2', support_id: 'support+id&123',
    });
    const feedback = feedbackFromSearch(`?${query}`);
    assert.equal(feedback.platform, 'Android');
    assert.equal(feedback.device, 'Pixel 10');
    assert.equal(feedback.osVersion, 'Android 16');
    assert.equal(feedback.qrmeVersion, '4.2');
    assert.equal(feedback.supportId, 'support+id&123');
    assert.equal(feedback.message, '');
    assert.equal(feedbackFromSearch('?platform=iOS').platform, 'iOS');
    assert.equal(feedbackFromSearch('?platform=unknown').platform, '');
    assert.equal(feedbackFromSearch('').platform, '');
});

test('empty or whitespace-only messages do not open an email', () => {
    assert.equal(feedbackMailto(feedbackFromSearch('?platform=iOS')), null);
    assert.equal(feedbackMailto({ ...feedbackFromSearch('?platform=iOS'), message: ' \n\t ' }), null);
});

test('a message cannot open an email until a platform is selected', () => {
    const feedback = { ...feedbackFromSearch(''), message: 'I have some feedback.' };
    assert.equal(feedbackMailto(feedback), null);
    assert.ok(feedbackMailto({ ...feedback, platform: 'iOS' }));
    assert.ok(feedbackMailto({ ...feedback, platform: 'Android' }));
});

test('email includes the message and optional details with safe URL encoding', () => {
    const feedback = {
        platform: 'Android', message: 'Hi! A&B + 50% #bug?\n日本語 👋 &bcc=someone@example.com',
        device: ' Pixel 10 ', osVersion: 'Android 16', qrmeVersion: '4.2', supportId: 'id+123&456',
    };
    const url = new URL(feedbackMailto(feedback));
    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, 'support@qrme.contact');
    assert.equal(url.searchParams.get('subject'), 'QR Me - Contact | Feedback');
    assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
    assert.equal(url.searchParams.get('body'), [
        'Hi! A&B + 50% #bug?', '日本語 👋 &bcc=someone@example.com', '',
        '----------------------------------------', 'Device Information',
        '    Platform: Android | Device: Pixel 10 | OS Version: Android 16 | QR Me Version: 4.2 | Support ID: id+123&456',
        '----------------------------------------',
    ].join('\r\n'));
});

test('optional blank fields are omitted and existing Windows newlines are preserved', () => {
    const url = new URL(feedbackMailto({
        ...feedbackFromSearch('?platform=iOS'), message: ' Hello\r\nthere! ', device: '   ',
    }));
    assert.equal(url.searchParams.get('body'), [
        'Hello', 'there!', '',
        '----------------------------------------', 'Device Information',
        '    Platform: iOS', '----------------------------------------',
    ].join('\r\n'));
});
