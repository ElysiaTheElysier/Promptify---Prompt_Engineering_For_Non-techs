import React from 'react';

interface Props {
  className?: string;
}

export const PromptifyMark: React.FC<Props> = ({ className = '' }) => (
  <img
    src="/brand/promptify-mark.png"
    alt=""
    aria-hidden="true"
    className={`h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11 ${className}`}
  />
);
