import privacyMarkdown from '../../docs/privacy-policy.md?raw';
import termsMarkdown from '../../docs/terms-of-use.md?raw';
import {noteData} from '../../src/data/index.ts';

export const aboutContent = {
  title: noteData.title,
  content: noteData.content,
  contact: noteData.contact,
  email: noteData.email,
  policyUrl: noteData.policyUrl,
  termsUrl: noteData.termsUrl,
  githubRepoUrl: noteData.githubRepoUrl,
  authorGithubUrl: noteData.authorGithubUrl,
  audioSourceOneUrl: noteData.audioSourceOneUrl,
  audioSourceTwoUrl: noteData.audioSourceTwoUrl,
};

export {privacyMarkdown, termsMarkdown};
