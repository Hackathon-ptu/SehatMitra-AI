import React from 'react';
import { Textarea } from '../../common/Textarea';

export interface TextQuestionProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const TextQuestion: React.FC<TextQuestionProps> = ({
  value,
  onChange,
  placeholder = 'Tell me in your own words...',
}) => {
  return (
    <div className="w-full max-w-xl">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={300}
        showCharCount
      />
    </div>
  );
};
