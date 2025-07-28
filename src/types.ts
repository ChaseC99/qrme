export type SocialProfile = {
    type?: string;
    userId?: string;
    url?: string;
};

export type LabeledValue = {
    label: string;
    value: string;
};

export type Contact = {
    name?: string;
    photo?: string;
    org?: string;
    dept?: string;
    title?: string;
    emails?: LabeledValue[];
    phones?: LabeledValue[];
    postalAddresses?: LabeledValue[];
    socialProfiles?: SocialProfile[];
    urls?: LabeledValue[];
    birthday?: string;
    note?: string;
};