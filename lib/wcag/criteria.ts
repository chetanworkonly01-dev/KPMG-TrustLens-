export interface WcagCriterion {
  id: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  principle: 'perceivable' | 'operable' | 'understandable' | 'robust';
  description: string;
  url: string;
}

export const WCAG_CRITERIA: Record<string, WcagCriterion> = {
  '1.1.1': {
    id: '1.1.1',
    name: 'Non-text Content',
    level: 'A',
    principle: 'perceivable',
    description: 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.',
    url: 'https://www.w3.org/TR/WCAG22/#non-text-content'
  },
  '1.2.1': {
    id: '1.2.1',
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'A',
    principle: 'perceivable',
    description: 'For prerecorded audio-only and prerecorded video-only media, alternatives are provided.',
    url: 'https://www.w3.org/TR/WCAG22/#audio-only-and-video-only-prerecorded'
  },
  '1.2.2': {
    id: '1.2.2',
    name: 'Captions (Prerecorded)',
    level: 'A',
    principle: 'perceivable',
    description: 'Captions are provided for all prerecorded audio content in synchronized media.',
    url: 'https://www.w3.org/TR/WCAG22/#captions-prerecorded'
  },
  '1.2.3': {
    id: '1.2.3',
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'A',
    principle: 'perceivable',
    description: 'An alternative for time-based media or audio description of the prerecorded video content is provided.',
    url: 'https://www.w3.org/TR/WCAG22/#audio-description-or-media-alternative-prerecorded'
  },
  '1.2.5': {
    id: '1.2.5',
    name: 'Audio Description (Prerecorded)',
    level: 'AA',
    principle: 'perceivable',
    description: 'Audio description is provided for all prerecorded video content in synchronized media.',
    url: 'https://www.w3.org/TR/WCAG22/#audio-description-prerecorded'
  },
  '1.3.1': {
    id: '1.3.1',
    name: 'Info and Relationships',
    level: 'A',
    principle: 'perceivable',
    description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
    url: 'https://www.w3.org/TR/WCAG22/#info-and-relationships'
  },
  '1.3.2': {
    id: '1.3.2',
    name: 'Meaningful Sequence',
    level: 'A',
    principle: 'perceivable',
    description: 'When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.',
    url: 'https://www.w3.org/TR/WCAG22/#meaningful-sequence'
  },
  '1.3.3': {
    id: '1.3.3',
    name: 'Sensory Characteristics',
    level: 'A',
    principle: 'perceivable',
    description: 'Instructions provided for understanding and operating content do not rely solely on sensory characteristics.',
    url: 'https://www.w3.org/TR/WCAG22/#sensory-characteristics'
  },
  '1.4.1': {
    id: '1.4.1',
    name: 'Use of Color',
    level: 'A',
    principle: 'perceivable',
    description: 'Color is not used as the only visual means of conveying information.',
    url: 'https://www.w3.org/TR/WCAG22/#use-of-color'
  },
  '1.4.3': {
    id: '1.4.3',
    name: 'Contrast (Minimum)',
    level: 'AA',
    principle: 'perceivable',
    description: 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1.',
    url: 'https://www.w3.org/TR/WCAG22/#contrast-minimum'
  },
  '1.4.5': {
    id: '1.4.5',
    name: 'Images of Text',
    level: 'AA',
    principle: 'perceivable',
    description: 'If the technologies being used can achieve the visual presentation, text is used to convey information rather than images of text.',
    url: 'https://www.w3.org/TR/WCAG22/#images-of-text'
  },
  '1.4.10': {
    id: '1.4.10',
    name: 'Reflow',
    level: 'AA',
    principle: 'perceivable',
    description: 'Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions.',
    url: 'https://www.w3.org/TR/WCAG22/#reflow'
  },
  '1.4.11': {
    id: '1.4.11',
    name: 'Non-text Contrast',
    level: 'AA',
    principle: 'perceivable',
    description: 'The visual presentation of UI components and graphical objects have a contrast ratio of at least 3:1.',
    url: 'https://www.w3.org/TR/WCAG22/#non-text-contrast'
  },
  '2.1.1': {
    id: '2.1.1',
    name: 'Keyboard',
    level: 'A',
    principle: 'operable',
    description: 'All functionality of the content is operable through a keyboard interface.',
    url: 'https://www.w3.org/TR/WCAG22/#keyboard'
  },
  '2.1.2': {
    id: '2.1.2',
    name: 'No Keyboard Trap',
    level: 'A',
    principle: 'operable',
    description: 'If keyboard focus can be moved to a component, focus can be moved away from that component using only a keyboard interface.',
    url: 'https://www.w3.org/TR/WCAG22/#no-keyboard-trap'
  },
  '2.2.1': {
    id: '2.2.1',
    name: 'Timing Adjustable',
    level: 'A',
    principle: 'operable',
    description: 'For each time limit that is set by the content, the user can turn off, adjust, or extend the time limit.',
    url: 'https://www.w3.org/TR/WCAG22/#timing-adjustable'
  },
  '2.2.2': {
    id: '2.2.2',
    name: 'Pause, Stop, Hide',
    level: 'A',
    principle: 'operable',
    description: 'For moving, blinking, scrolling, or auto-updating information, there is a mechanism for the user to pause, stop, or hide it.',
    url: 'https://www.w3.org/TR/WCAG22/#pause-stop-hide'
  },
  '2.4.1': {
    id: '2.4.1',
    name: 'Bypass Blocks',
    level: 'A',
    principle: 'operable',
    description: 'A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.',
    url: 'https://www.w3.org/TR/WCAG22/#bypass-blocks'
  },
  '2.4.2': {
    id: '2.4.2',
    name: 'Page Titled',
    level: 'A',
    principle: 'operable',
    description: 'Web pages have titles that describe topic or purpose.',
    url: 'https://www.w3.org/TR/WCAG22/#page-titled'
  },
  '2.4.3': {
    id: '2.4.3',
    name: 'Focus Order',
    level: 'A',
    principle: 'operable',
    description: 'If a Web page can be navigated sequentially, focusable components receive focus in an order that preserves meaning and operability.',
    url: 'https://www.w3.org/TR/WCAG22/#focus-order'
  },
  '2.4.4': {
    id: '2.4.4',
    name: 'Link Purpose (In Context)',
    level: 'A',
    principle: 'operable',
    description: 'The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context.',
    url: 'https://www.w3.org/TR/WCAG22/#link-purpose-in-context'
  },
  '2.4.5': {
    id: '2.4.5',
    name: 'Multiple Ways',
    level: 'AA',
    principle: 'operable',
    description: 'More than one way is available to locate a Web page within a set of Web pages.',
    url: 'https://www.w3.org/TR/WCAG22/#multiple-ways'
  },
  '2.4.7': {
    id: '2.4.7',
    name: 'Focus Visible',
    level: 'AA',
    principle: 'operable',
    description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
    url: 'https://www.w3.org/TR/WCAG22/#focus-visible'
  },
  '2.4.8': {
    id: '2.4.8',
    name: 'Location',
    level: 'AAA',
    principle: 'operable',
    description: 'Information about the user\'s location within a set of Web pages is available.',
    url: 'https://www.w3.org/TR/WCAG22/#location'
  },
  '2.4.11': {
    id: '2.4.11',
    name: 'Focus Not Obscured (Minimum)',
    level: 'AA',
    principle: 'operable',
    description: 'When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content.',
    url: 'https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum'
  },
  '2.5.3': {
    id: '2.5.3',
    name: 'Label in Name',
    level: 'A',
    principle: 'operable',
    description: 'For user interface components with labels that include text or images of text, the name contains the text that is presented visually.',
    url: 'https://www.w3.org/TR/WCAG22/#label-in-name'
  },
  '2.5.4': {
    id: '2.5.4',
    name: 'Motion Actuation',
    level: 'A',
    principle: 'operable',
    description: 'Functionality that can be operated by device motion or user motion can also be operated by user interface components.',
    url: 'https://www.w3.org/TR/WCAG22/#motion-actuation'
  },
  '2.5.7': {
    id: '2.5.7',
    name: 'Dragging Movements',
    level: 'AA',
    principle: 'operable',
    description: 'All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging.',
    url: 'https://www.w3.org/TR/WCAG22/#dragging-movements'
  },
  '2.5.8': {
    id: '2.5.8',
    name: 'Target Size (Minimum)',
    level: 'AA',
    principle: 'operable',
    description: 'The size of the target for pointer inputs is at least 24 by 24 CSS pixels.',
    url: 'https://www.w3.org/TR/WCAG22/#target-size-minimum'
  },
  '3.1.1': {
    id: '3.1.1',
    name: 'Language of Page',
    level: 'A',
    principle: 'understandable',
    description: 'The default human language of each Web page can be programmatically determined.',
    url: 'https://www.w3.org/TR/WCAG22/#language-of-page'
  },
  '3.1.2': {
    id: '3.1.2',
    name: 'Language of Parts',
    level: 'AA',
    principle: 'understandable',
    description: 'The human language of each passage or phrase in the content can be programmatically determined.',
    url: 'https://www.w3.org/TR/WCAG22/#language-of-parts'
  },
  '3.2.1': {
    id: '3.2.1',
    name: 'On Focus',
    level: 'A',
    principle: 'understandable',
    description: 'When any user interface component receives focus, it does not initiate a change of context.',
    url: 'https://www.w3.org/TR/WCAG22/#on-focus'
  },
  '3.2.2': {
    id: '3.2.2',
    name: 'On Input',
    level: 'A',
    principle: 'understandable',
    description: 'Changing the setting of any user interface component does not automatically cause a change of context.',
    url: 'https://www.w3.org/TR/WCAG22/#on-input'
  },
  '3.2.4': {
    id: '3.2.4',
    name: 'Consistent Identification',
    level: 'AA',
    principle: 'understandable',
    description: 'Components that have the same functionality within a set of Web pages are identified consistently.',
    url: 'https://www.w3.org/TR/WCAG22/#consistent-identification'
  },
  '3.2.6': {
    id: '3.2.6',
    name: 'Consistent Help',
    level: 'A',
    principle: 'understandable',
    description: 'If a Web page contains help mechanisms, they occur in the same relative order on each page.',
    url: 'https://www.w3.org/TR/WCAG22/#consistent-help'
  },
  '3.3.1': {
    id: '3.3.1',
    name: 'Error Identification',
    level: 'A',
    principle: 'understandable',
    description: 'If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
    url: 'https://www.w3.org/TR/WCAG22/#error-identification'
  },
  '3.3.2': {
    id: '3.3.2',
    name: 'Labels or Instructions',
    level: 'A',
    principle: 'understandable',
    description: 'Labels or instructions are provided when content requires user input.',
    url: 'https://www.w3.org/TR/WCAG22/#labels-or-instructions'
  },
  '3.3.3': {
    id: '3.3.3',
    name: 'Error Suggestion',
    level: 'AA',
    principle: 'understandable',
    description: 'If an input error is automatically detected and suggestions for correction are known, they are provided to the user.',
    url: 'https://www.w3.org/TR/WCAG22/#error-suggestion'
  },
  '3.3.4': {
    id: '3.3.4',
    name: 'Error Prevention (Legal, Financial, Data)',
    level: 'AA',
    principle: 'understandable',
    description: 'For pages that cause legal commitments or financial transactions, submissions are reversible, checked, or confirmed.',
    url: 'https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data'
  },
  '3.3.7': {
    id: '3.3.7',
    name: 'Redundant Entry',
    level: 'A',
    principle: 'understandable',
    description: 'Information previously entered by or provided to the user that is required to be entered again is auto-populated or available for selection.',
    url: 'https://www.w3.org/TR/WCAG22/#redundant-entry'
  },
  '3.3.8': {
    id: '3.3.8',
    name: 'Accessible Authentication (Minimum)',
    level: 'AA',
    principle: 'understandable',
    description: 'A cognitive function test is not required for any step in an authentication process unless an alternative is provided.',
    url: 'https://www.w3.org/TR/WCAG22/#accessible-authentication-minimum'
  },
  '4.1.2': {
    id: '4.1.2',
    name: 'Name, Role, Value',
    level: 'A',
    principle: 'robust',
    description: 'For all user interface components, the name and role can be programmatically determined.',
    url: 'https://www.w3.org/TR/WCAG22/#name-role-value'
  },
  '4.1.3': {
    id: '4.1.3',
    name: 'Status Messages',
    level: 'AA',
    principle: 'robust',
    description: 'In content implemented using markup languages, status messages can be programmatically determined through role or properties.',
    url: 'https://www.w3.org/TR/WCAG22/#status-messages'
  }
};

export function getCriterionById(id: string): WcagCriterion | undefined {
  return WCAG_CRITERIA[id];
}

export function getCriteriaByLevel(level: 'A' | 'AA' | 'AAA'): WcagCriterion[] {
  return Object.values(WCAG_CRITERIA).filter(c => c.level === level);
}

export function getCriteriaByPrinciple(principle: string): WcagCriterion[] {
  return Object.values(WCAG_CRITERIA).filter(c => c.principle === principle);
}
