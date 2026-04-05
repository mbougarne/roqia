import ReactMarkdown from 'react-markdown';

import {termsMarkdown} from '../content';

export function TermsPage() {
  return (
    <section className="doc-page markdown-page">
      <ReactMarkdown>{termsMarkdown}</ReactMarkdown>
    </section>
  );
}
