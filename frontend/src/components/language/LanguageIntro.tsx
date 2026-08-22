import React from 'react';

export const LanguageIntro: React.FC = () => {
  return (
    <div className="flex flex-col gap-2.5 text-center mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
        How would you like to talk to SehatMitra?
      </h1>
      <p className="text-body-md text-content-muted leading-relaxed">
        Choose the language you’re most comfortable using.
      </p>
    </div>
  );
};
