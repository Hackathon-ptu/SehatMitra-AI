export interface HeroChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const HERO_MOCK_CHAT: HeroChatMessage[] = [
  {
    id: 'm1',
    sender: 'ai',
    text: "Tell me what's bothering you.",
    timestamp: '10:14 AM',
  },
  {
    id: 'm2',
    sender: 'user',
    text: "I've had fever for five days.",
    timestamp: '10:15 AM',
  },
  {
    id: 'm3',
    sender: 'ai',
    text: 'How high has your temperature been?',
    timestamp: '10:15 AM',
  },
  {
    id: 'm4',
    sender: 'user',
    text: '102°F',
    timestamp: '10:16 AM',
  },
];

export interface CapabilityItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export const CAPABILITY_ITEMS: CapabilityItem[] = [
  {
    id: 'c1',
    title: 'Multilingual',
    description: 'Use the language you are most comfortable with.',
    iconName: 'Globe',
  },
  {
    id: 'c2',
    title: 'Voice Supported',
    description: 'Talk to SehatMitra instead of typing long messages.',
    iconName: 'Mic',
  },
  {
    id: 'c3',
    title: 'Health Interview',
    description: 'Answer guided follow-up questions for clearer context.',
    iconName: 'ClipboardList',
  },
  {
    id: 'c4',
    title: 'Simple Explanations',
    description: 'Understand lab reports & recommendations in plain language.',
    iconName: 'FileText',
  },
];

export interface HowItWorksStep {
  stepNumber: string;
  title: string;
  subtitle: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    stepNumber: '01',
    title: 'Talk',
    subtitle: 'Share your symptoms',
    description: "Tell us what you are experiencing in your own words or using voice.",
  },
  {
    stepNumber: '02',
    title: 'Understand',
    subtitle: 'Answer follow-up questions',
    description: 'Answer a few guided clinical questions to help clarify severity & duration.',
  },
  {
    stepNumber: '03',
    title: 'Know what to do next',
    subtitle: 'Receive clear guidance',
    description: 'Get understandable triage recommendations and find nearby facilities.',
  },
];
