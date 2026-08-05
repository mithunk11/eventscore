import { LEGAL as L } from './config'
import type { LegalDoc } from './types'

export const TERMS: LegalDoc = {
  title: 'Terms of Service',
  updated: L.updated,
  sections: [
    { h: 'Who we are', p: [
      `${L.tradingName} is operated by ${L.legalName}, ${L.companyNumber}, of ${L.address}, Ireland ("we", "us", "our"). You can contact us at ${L.contactEmail}.`,
    ]},
    { h: 'What these terms cover', p: [
      'These terms form a contract between us and the organisation or individual holding an EventScore account ("you", "the Customer"). By ticking the acceptance boxes during setup you accept these terms, our Privacy Policy and our Data Processing Agreement, all three of which apply together.',
      'If you accept on behalf of an organisation, you confirm you have authority to bind that organisation.',
    ]},
    { h: 'The service', p: [
      'EventScore lets you configure a competition, invite judges, collect their scores on their own devices, calculate totals and rankings, and produce a results output.',
      'We provide access to software. We do not organise, run or adjudicate your events, and we take no part in them.',
    ]},
    { h: 'Your account', list: [
      'Accounts are created by us at your request. Credentials are issued to the email address you give us.',
      'You are responsible for keeping your credentials secure and for all activity under your account.',
      'You are responsible for the judge invitation links and PINs generated in your account, including who you send them to and revoking them when a judge no longer needs access.',
      `Tell us promptly at ${L.contactEmail} if you believe your account has been accessed without your authorisation.`,
    ]},
    { h: 'Limits on your account', p: [
      'Your account carries limits on the number of events, contestants and judges you may create, reflecting what has been agreed between us. We may adjust these by agreement, and will not reduce them in a way that disrupts an event already in progress.',
    ]},
    { h: 'Acceptable use', p: ['You must not:'], list: [
      'use EventScore for any unlawful purpose',
      'upload personal data relating to any person under the age of 18',
      'upload content that is defamatory, obscene or harassing, or that infringes anyone\u2019s intellectual property or privacy rights',
      'upload any photograph or personal detail of any person without that person\u2019s consent',
      'attempt to gain unauthorised access to any part of the service, other customers\u2019 data, or our infrastructure',
      'resell, sublicense or white-label the service without our written agreement',
      'use automated means to scrape, overload or interfere with the service',
    ]},
    { h: 'Age restriction', p: [
      'EventScore is provided only for competitions in which all contestants and judges are aged 18 or over.',
      'You warrant that no personal data relating to any person under 18 will be uploaded to or processed through the service, including names, photographs, descriptions and scores.',
      'If we become aware that your account contains personal data relating to a minor, we may suspend your account and delete that data without notice. You are solely responsible for any consequences arising from a breach of this clause and you indemnify us in respect of it.',
    ]},
    { h: 'Your content and the consents you must obtain', p: [
      'You retain all rights in the content you upload, including contestant names, photographs, descriptions, scores and comments. You grant us a limited licence to host, store, process and display it solely to provide the service to you.',
      'You warrant that, before uploading any personal data of any individual, you have obtained that individual\u2019s informed consent, or have another valid lawful basis under the GDPR, for that data to be processed by EventScore for the purpose of operating your competition. This applies to contestants, judges and anyone else.',
      'If you enable public sharing of results, you warrant that you have consent from each affected individual for their name, photograph and scores to be published on a publicly accessible page.',
      'You are the data controller in respect of this content. We are your data processor. That relationship is governed by our Data Processing Agreement.',
    ]},
    { h: 'Results and your responsibility for outcomes', p: [
      'EventScore performs arithmetic on the scores judges enter. It does not verify that those scores are correct, fair, or that they were entered by the intended person.',
      'You are solely responsible for verifying results before announcing or acting on them. We strongly recommend reviewing the standings on screen and exporting the results before any public announcement.',
      'We accept no responsibility for the outcome of any competition run using the service; for any dispute between you, a contestant, a judge or a third party concerning results, scoring, rankings or tie-breaks; for any prize, award or title granted or withheld on the basis of results produced by the service; or for any reputational, commercial or other loss arising from an incorrect, disputed or contested result.',
      'Tie-break outcomes follow rules you configure. You are responsible for those rules being appropriate for your competition.',
    ]},
    { h: 'Availability, connectivity and events', p: [
      'We aim to keep EventScore available but do not guarantee uninterrupted or error-free operation. The service may be unavailable due to maintenance, third-party provider outage, or matters outside our control.',
      'EventScore requires an internet connection. You are responsible for connectivity at your venue. We are not responsible for failure or disruption caused by inadequate connectivity, venue infrastructure or judges\u2019 devices.',
      'We strongly recommend testing the service at your venue in advance and keeping a paper fallback available for any live event. You accept that running a live event without a fallback is at your own risk.',
      'We do not offer a guaranteed support response time unless separately agreed in writing.',
    ]},
    { h: 'Fees', p: [
      'Fees, if any, are agreed separately between us and are not processed through the service. Non-payment of agreed fees may result in suspension or termination under the clause below.',
    ]},
    { h: 'Our access to your data', p: [
      'By default we do not access the event data in your account. Our systems are configured so that event data is not available through our administrative tools.',
      'You may grant us temporary access using the visibility control in your account settings, for example so we can help with a support issue. Access granted that way is time-limited, expires automatically, and you may revoke it at any time.',
      'We may access your data without your consent only where legally required, or where strictly necessary to investigate a security incident or suspected breach of these terms. We will tell you where we are permitted to.',
      'We keep a log of administrative access to accounts.',
    ]},
    { h: 'Suspension and termination', list: [
      'We may set your account to read-only, suspend it, or terminate it if you breach these terms, if agreed fees are unpaid, or if required by law.',
      'Where practicable and where the reason permits, we will give notice first, and will avoid doing so during a live event.',
      'You may close your account at any time by contacting us.',
      'On termination your data is retained for 30 days and then permanently deleted. You may request an export during that period.',
    ]},
    { h: 'Liability', p: [
      'Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for anything else that cannot lawfully be limited.',
      'Subject to the above, we are not liable for loss of profit, business or revenue; loss of anticipated savings; loss of goodwill or reputation; loss or corruption of data; or any indirect or consequential loss, however arising.',
      `Subject to the above, our total aggregate liability arising out of or in connection with these terms, whether in contract, tort including negligence, or otherwise, is limited to the greater of the total fees you paid us in the twelve months preceding the event giving rise to the claim, and \u20AC${L.liabilityFloor}.`,
      'The service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law we exclude all warranties, conditions and terms implied by statute or common law.',
    ]},
    { h: 'Indemnity', p: ['You will indemnify us against all claims, losses, damages, costs and expenses, including reasonable legal fees, arising from:'], list: [
      'your breach of these terms',
      'any claim by a contestant, judge or other individual relating to the processing of their personal data through your account, including any claim that you did not obtain valid consent',
      'any dispute concerning the results of a competition run using the service',
      'any upload of personal data relating to a person under 18',
    ]},
    { h: 'Changes to these terms', p: [
      'We may update these terms and will give at least 30 days\u2019 notice by email of any material change. Continued use after that period constitutes acceptance. If you do not accept a change you may close your account.',
    ]},
    { h: 'Governing law', p: [
      'These terms are governed by the laws of Ireland. The courts of Ireland have exclusive jurisdiction over any dispute arising out of or in connection with them.',
    ]},
    { h: 'General', list: [
      'If any provision is unenforceable, the remainder continues in effect.',
      'These terms, with the Privacy Policy and Data Processing Agreement, are the entire agreement between us.',
      'You may not assign your rights under these terms without our written consent.',
    ]},
  ],
}
