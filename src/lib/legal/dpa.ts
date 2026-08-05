import { LEGAL as L } from './config'
import type { LegalDoc } from './types'

export const DPA: LegalDoc = {
  title: 'Data Processing Agreement',
  updated: L.updated,
  sections: [
    { h: 'Scope', p: [
      `This Agreement forms part of the Terms of Service between ${L.legalName} ("Processor") and the Customer ("Controller") and applies to all processing of personal data carried out by the Processor on the Controller\u2019s behalf.`,
      'GDPR means Regulation (EU) 2016/679. Personal Data, Processing, Data Subject, Supervisory Authority and Personal Data Breach have the meanings given in the GDPR.',
      'The Controller is the controller of the content it uploads. The Processor processes that Personal Data on the Controller\u2019s behalf.',
    ]},
    { h: 'Details of processing', table: {
      head: ['', ''],
      rows: [
        ['Subject matter', 'Provision of the EventScore competition scoring service'],
        ['Duration', 'The term of the Terms of Service, plus the retention periods in the Privacy Policy'],
        ['Nature and purpose', 'Collection, storage, calculation, ranking, display and export of competition scores and related information'],
        ['Types of Personal Data', 'Names, photographs, written descriptions, numeric scores, written comments, entry numbers, access credentials'],
        ['Categories of Data Subject', 'Contestants, judges, and the Controller\u2019s own personnel'],
        ['Special category data', 'None. The Controller must not upload special category data as defined in Article 9 GDPR'],
      ],
    }},
    { h: 'Processor obligations', p: ['The Processor shall:'], list: [
      'Instructions: process Personal Data only on the Controller\u2019s documented instructions, including as set out in this Agreement and in the Controller\u2019s use of the service, unless required otherwise by EU or Member State law. The Processor shall inform the Controller of any such legal requirement before processing, unless the law prohibits this.',
      'Confidentiality: ensure any person authorised to process the Personal Data is bound by an obligation of confidentiality.',
      'Security: implement appropriate technical and organisational measures under Article 32 GDPR, including those described in the Privacy Policy.',
      'Sub-processors: the Controller gives general authorisation for the Processor to engage the sub-processors listed in the Privacy Policy. The Processor shall give at least 14 days\u2019 notice before adding or replacing one, during which the Controller may object on reasonable data protection grounds. Where the Controller objects, either party may terminate. The Processor shall impose obligations on each sub-processor no less protective than those here, and remains fully liable for their performance.',
      'Data subject rights: taking into account the nature of the processing, assist the Controller by appropriate technical and organisational measures in responding to requests from Data Subjects. Where the Processor receives such a request directly it shall not respond substantively but shall promptly forward it to the Controller.',
      'Assistance: assist the Controller in ensuring compliance with Articles 32 to 36 GDPR, taking into account the nature of processing and the information available to the Processor.',
      'Breach notification: notify the Controller without undue delay, and in any event within 48 hours, after becoming aware of a Personal Data Breach affecting the Controller\u2019s Personal Data, providing sufficient information for the Controller to meet its obligations under Articles 33 and 34.',
      'Deletion or return: at the Controller\u2019s choice, delete or return all Personal Data at the end of the provision of services and delete existing copies, unless EU or Member State law requires storage. Absent a choice, the Processor shall delete in accordance with the retention periods in the Privacy Policy.',
      'Audit: make available all information necessary to demonstrate compliance with Article 28, and allow for and contribute to audits by the Controller or an auditor it mandates. Audits shall be at the Controller\u2019s cost, on reasonable notice, no more than once in any twelve-month period unless required by a Supervisory Authority, and conducted so as to minimise disruption.',
      'International transfers: not transfer Personal Data outside the European Economic Area without the Controller\u2019s prior written consent and an appropriate transfer mechanism under Chapter V GDPR.',
    ]},
    { h: 'Controller obligations', p: ['The Controller warrants and undertakes that:'], list: [
      'it has a valid lawful basis under the GDPR for all Personal Data it uploads to or processes through the service',
      'it has provided all information required by Articles 13 and 14 GDPR to all relevant Data Subjects, including that their data will be processed using a third-party scoring platform',
      'it has obtained all necessary consents from contestants and judges for their names, photographs, descriptions, scores and comments to be processed and, where public sharing is enabled, published',
      'it will not upload Personal Data relating to any person under 18',
      'it will not upload special category data as defined in Article 9 GDPR',
      'its instructions to the Processor will not cause the Processor to breach the GDPR',
      'it will manage judge access credentials responsibly and revoke access when no longer required',
    ]},
    { h: 'Liability, term and law', p: [
      'Each party\u2019s liability under this Agreement is subject to the limitations and exclusions in the Terms of Service, save where the GDPR provides otherwise.',
      'This Agreement takes effect on acceptance of the Terms of Service and continues for as long as the Processor processes Personal Data on the Controller\u2019s behalf.',
      'It is governed by the laws of Ireland.',
    ]},
  ],
}
