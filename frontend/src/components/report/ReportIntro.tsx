import React from 'react';

export const ReportIntro: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 text-center max-w-xl mx-auto mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
        Medical reports shouldn’t feel like another language.
      </h1>
      <p className="text-sm sm:text-base text-content-muted leading-relaxed">
        Upload a report and SehatMitra will help explain the important information in simpler terms.
      </p>
    </div>
  );
};
