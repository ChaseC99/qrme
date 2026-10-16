import { SUPPORT_EMAIL } from './constants';

export type Feedback = {
    platform: 'iOS' | 'Android' | '';
    message: string;
    device: string;
    osVersion: string;
    qrmeVersion: string;
    supportId: string;
};

export function feedbackFromSearch(search: string): Feedback {
    const params = new URLSearchParams(search);
    const platform = params.get('platform')?.trim().toLowerCase();
    return {
        platform: platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : '',
        message: '',
        device: params.get('device') ?? '',
        osVersion: params.get('os_version') ?? '',
        qrmeVersion: params.get('qrme_version') ?? '',
        supportId: params.get('support_id') ?? '',
    };
}

export function feedbackMailto(feedback: Feedback, submittedAt: Date = new Date()): string | null {
    const message = feedback.message.trim();
    if (!feedback.platform || !message) return null;

    const details = [
        ['Platform', feedback.platform],
        ['Device', feedback.device],
        ['OS Version', feedback.osVersion],
        ['QR Me Version', feedback.qrmeVersion],
        ['Support ID', feedback.supportId],
    ].filter(([, value]) => value.trim()).map(([label, value]) => `${label}: ${value.trim()}`);
    const divider = '----------------------------------------';
    const body = [
        message.replace(/\r?\n/g, '\r\n'),
        '',
        divider,
        'Device Information',
        `    ${details.join(' | ')}`,
        divider,
    ].join('\r\n');

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('QR Me - Contact | Feedback')}&body=${encodeURIComponent(body)}`;
}
