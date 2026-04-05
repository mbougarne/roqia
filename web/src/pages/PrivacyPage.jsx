import ReactMarkdown from 'react-markdown';

import {privacyMarkdown} from '../content';

export function PrivacyPage() {
  return (
    <section className="doc-page markdown-page">
      <ReactMarkdown>{privacyMarkdown}</ReactMarkdown>
    </section>
  );
}
