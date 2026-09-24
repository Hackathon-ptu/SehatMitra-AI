import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mic, Sparkles, Square } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ashaHttp, errorMessage } from '../api';
import type { VisitType, VoiceDraft } from '../types';
import { Btn, TextArea, toast } from './ui';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null;
};

const getRecognition = (): (new () => Recognition) | null => {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/**
 * Speak (or type) the visit in your own words; the AI drafts the form fields.
 * Nothing is saved until the ASHA reviews the form and presses Save.
 */
export const VoiceNote: React.FC<{
  visitType: VisitType;
  transcript: string;
  onTranscript: (text: string) => void;
  onDraft: (draft: VoiceDraft) => void;
}> = ({ visitType, transcript, onTranscript, onDraft }) => {
  const { t, i18n } = useTranslation('asha');
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const baseRef = useRef('');
  const Rec = getRecognition();

  useEffect(() => () => recRef.current?.stop(), []);

  const start = () => {
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`;
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = transcript ? `${transcript.trim()} ` : '';
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
      onTranscript(baseRef.current + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast(t('voice.micError', 'Could not use the microphone. You can type instead.'), 'error');
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const parse = async () => {
    if (transcript.trim().length < 5) return;
    stop();
    setParsing(true);
    try {
      const { data } = await ashaHttp.post<VoiceDraft>('/voice/parse', { transcript, lang: i18n.language, visit_type: visitType });
      onDraft(data);
      setSummary(data.summary || null);
      toast(t('voice.filled', 'Form filled from your note — please check each field'), 'info');
    } catch (e) {
      toast(errorMessage(e, t('voice.parseFailed', 'Could not read the note. Please fill the form.')), 'error');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/10 dark:to-transparent p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-content-primary flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-600" />{t('voice.title', 'Quick note by voice')}</p>
          <p className="text-xs text-content-muted mt-0.5">{t('voice.hint', 'Say what you observed, e.g. “BP 150/100, swelling in feet, headache”.')}</p>
        </div>
        {Rec && (
          <button
            type="button"
            onClick={listening ? stop : start}
            className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors',
              listening ? 'bg-red-600 text-white animate-pulse' : 'bg-violet-600 text-white hover:bg-violet-700')}
            aria-label={listening ? t('voice.stop', 'Stop') : t('voice.start', 'Speak')}
          >
            {listening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </div>
      <TextArea
        value={transcript}
        onChange={(e) => onTranscript(e.target.value)}
        rows={2}
        placeholder={listening ? t('voice.listening', 'Listening…') : t('voice.placeholder', 'Speak or type your note here')}
        className="bg-surface-card"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        {summary ? <p className="text-xs text-content-muted line-clamp-2">{summary}</p> : <span />}
        <Btn size="sm" tone="secondary" onClick={parse} disabled={transcript.trim().length < 5 || parsing}
          icon={parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-violet-600" />}>
          {t('voice.fill', 'Fill form')}
        </Btn>
      </div>
    </div>
  );
};
