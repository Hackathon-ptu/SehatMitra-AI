import { ConversationItem, SuggestionPrompt } from '../types/chat';

export const INITIAL_SUGGESTIONS: SuggestionPrompt[] = [
  { id: 's1', label: 'I have a fever', query: 'I have a fever' },
  { id: 's2', label: 'I have a headache', query: 'I have a headache' },
  { id: 's3', label: 'I feel dizzy', query: 'I feel dizzy' },
  { id: 's4', label: 'I have been coughing', query: 'I have been coughing' },
];

export const MOCK_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'conv-1',
    title: 'Fever and weakness',
    date: 'Today',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        content: "I've had fever for five days.",
        timestamp: '10:14 AM',
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'I can help you understand what information may matter. How high has your temperature been?',
        timestamp: '10:14 AM',
      },
      {
        id: 'm3',
        sender: 'user',
        content: '102°F',
        timestamp: '10:15 AM',
      },
      {
        id: 'm4',
        sender: 'ai',
        content: 'Thank you. Are you also experiencing cough, breathing difficulty, chest pain, or severe weakness?',
        timestamp: '10:15 AM',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Headache since yesterday',
    date: 'Yesterday',
    messages: [
      {
        id: 'm21',
        sender: 'user',
        content: "I've had a throbbing headache since yesterday morning.",
        timestamp: '3:20 PM',
      },
      {
        id: 'm22',
        sender: 'ai',
        content: 'I understand. Is the headache located on one side of your head or all over? Are you experiencing any nausea or light sensitivity?',
        timestamp: '3:21 PM',
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Blood report questions',
    date: '3 days ago',
    messages: [
      {
        id: 'm31',
        sender: 'user',
        content: 'My hemoglobin shows 9.2 g/dL. Is that dangerous?',
        timestamp: '11:05 AM',
      },
      {
        id: 'm32',
        sender: 'ai',
        content: 'A hemoglobin value of 9.2 g/dL is below typical reference ranges (usually 12.0–15.5 g/dL for adults). It suggests mild anemia. I recommend discussing this result with your doctor for proper evaluation.',
        timestamp: '11:06 AM',
      },
    ],
  },
  {
    id: 'conv-4',
    title: 'Feeling dizzy',
    date: '1 week ago',
    messages: [
      {
        id: 'm41',
        sender: 'user',
        content: 'I feel dizzy when I stand up quickly.',
        timestamp: '5:45 PM',
      },
      {
        id: 'm42',
        sender: 'ai',
        content: 'Feeling lightheaded when standing up rapidly can happen due to temporary blood pressure changes or dehydration. Are you drinking enough water today?',
        timestamp: '5:46 PM',
      },
    ],
  },
];

export function getMockAiResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('fever') || lower.includes('temperature') || lower.includes('bukhar')) {
    return 'I hear you regarding the fever. Have you noticed any other symptoms like chills, body ache, or difficulty swallowing? Also, are you staying hydrated?';
  }

  if (lower.includes('headache') || lower.includes('head') || lower.includes('sar dard')) {
    return 'Headaches can stem from stress, eye strain, or dehydration. Is the pain severe or accompanied by neck stiffness or vision changes?';
  }

  if (lower.includes('cough') || lower.includes('cold') || lower.includes('throat')) {
    return 'For cough or sore throat symptoms, how long has it lasted? Are you coughing up phlegm or is it a dry cough?';
  }

  if (lower.includes('dizzy') || lower.includes('dizziness') || lower.includes('chakkar')) {
    return 'Dizziness requires careful observation. Are you feeling unsteadiness when walking, or spinning sensations (vertigo)? Please sit down safely while we discuss.';
  }

  if (lower.includes('report') || lower.includes('blood') || lower.includes('test')) {
    return 'I can help break down medical report terms into plain language. What specific test values or parameters are listed on your report?';
  }

  return 'Thank you for sharing that. To help me give you clearer guidance, could you tell me a little more about when this started and how severe it feels?';
}
