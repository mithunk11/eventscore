import { LEGAL as L } from './config'
import type { LegalDoc } from './types'

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  updated: L.updated,
  sections: [
    { h: 'Introduction', p: [
      `This policy explains how ${L.legalName} handles personal data in connection with ${L.tradingName}.`,
      'There are two distinct situations, and the difference matters. We are the data controller for information about our customers, meaning the people and organisations who hold accounts. We are a data processor for the event data our customers put into the service: contestant names, photographs, descriptions, scores, comments and judge details. For that data our customer is the controller and decides what happens to it.',
      'If you are a contestant or a judge and want to know why your data is being processed, contact the organisation running your event.',
    ]},
    { h: 'Data we hold as controller', table: {
      head: ['What', 'Why', 'Lawful basis'],
      rows: [
        ['Name, email address, organisation name', 'To create and operate your account', 'Performance of a contract'],
        ['Login credentials, with passwords stored hashed and never in readable form', 'To secure your account', 'Performance of a contract'],
        ['Support correspondence', 'To help you', 'Legitimate interests'],
        ['Access and security logs, including IP address, timestamps and actions taken', 'To keep the service secure and investigate incidents', 'Legitimate interests'],
      ],
    }},
    { h: 'Data we process on behalf of customers', p: ['Our customers may upload:'], list: [
      'Contestant data: name, entry number, photograph, description',
      'Judge data: name, photograph, access PIN',
      'Scoring data: scores, written comments, timestamps',
    ]},
    { h: 'How we use it', p: [
      'We process event data only on the customer\u2019s documented instructions, as set out in our Data Processing Agreement. We do not use it for any purpose of our own, we do not use it to train machine learning models, and we do not sell it or share it for marketing.',
    ]},
    { h: 'Children', p: [
      `EventScore is not intended for use by, or in relation to, anyone under 18. Our terms prohibit customers from uploading personal data relating to minors. If you believe a minor\u2019s data has been uploaded, contact us at ${L.privacyEmail} and we will investigate.`,
    ]},
    { h: 'Where your data is stored', p: [
      `All data is stored on servers located in ${L.hostingRegion}, within the European Economic Area. We do not transfer personal data outside the EEA.`,
    ]},
    { h: 'Sub-processors', table: {
      head: ['Provider', 'Purpose', 'Location'],
      rows: [
        ['Supabase', 'Database, authentication and file storage', `EU (${L.hostingRegion})`],
        ['Vercel', 'Application hosting', 'EU'],
      ],
    }},
    { h: 'How long we keep data', table: {
      head: ['Data', 'Retention'],
      rows: [
        ['Customer account data', 'While the account is active, then 12 months'],
        ['Event data', `Deleted automatically ${L.retentionDays} days after the event date, or sooner if the customer chooses`],
        ['Data in a terminated account', '30 days, then permanently deleted'],
        ['Security and access logs', '12 months'],
      ],
    }},
    { h: 'Security', p: [
      'We protect data using encryption in transit, row-level database access controls that isolate each customer\u2019s data, hashed passwords, multi-factor authentication on administrative accounts, logging of administrative access, and regular application of security updates from our providers.',
      'No system is perfectly secure. We do not claim that ours is.',
    ]},
    { h: 'Our access to customer event data', p: [
      'Our administrative tools do not provide access to customer event data. Customers may grant temporary, expiring access for support purposes using a control in their account. We may access data without consent only where legally required, or where strictly necessary to investigate a security incident. All administrative access is logged.',
    ]},
    { h: 'Your rights', p: [
      'Under the GDPR you have the right to access your data, correct it, have it erased, restrict or object to its processing, receive it in a portable format, and withdraw consent where consent is the basis for processing.',
      `To exercise these rights in relation to your customer account, contact ${L.privacyEmail}. We will respond within one month.`,
      'If you are a contestant or judge, your data is controlled by the organisation running your event, so please contact them directly. If you contact us, we will forward your request to that organisation and assist them in responding.',
    ]},
    { h: 'Complaints', p: [
      'You have the right to lodge a complaint with the Irish Data Protection Commission, 6 Pembroke Row, Dublin 2, D02 X963, dataprotection.ie.',
    ]},
    { h: 'Cookies', p: [
      'We use only strictly necessary cookies, being those required to keep you logged in and to keep the service secure. We do not use advertising, tracking or analytics cookies, and for that reason no cookie consent banner is shown.',
    ]},
    { h: 'Changes', p: [
      'We will post any changes on this page and update the date at the top. Material changes are notified to account holders by email.',
    ]},
    { h: 'Contact', p: [
      `${L.legalName}, ${L.address}. ${L.privacyEmail}`,
    ]},
  ],
}
