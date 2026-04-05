import {aboutContent} from '../content';

const links = [
  {label: 'سياسة الخصوصية', href: aboutContent.policyUrl},
  {label: 'شروط الاستخدام', href: aboutContent.termsUrl},
  {label: 'مستودع المشروع على GitHub', href: aboutContent.githubRepoUrl},
  {label: 'حساب المؤلف على GitHub', href: aboutContent.authorGithubUrl},
  {label: 'مصدر الصوت: alazkar.today', href: aboutContent.audioSourceOneUrl},
  {label: 'مصدر الصوت: mp3quran.net', href: aboutContent.audioSourceTwoUrl},
];

export function AboutPage() {
  return (
    <section className="doc-page" dir="rtl">
      <h1>{aboutContent.title}</h1>
      <p className="body-block">{aboutContent.content}</p>
      <p className="body-block">{aboutContent.contact}</p>
      <p>
        <strong>البريد الإلكتروني:</strong> {aboutContent.email}
      </p>

      <div className="link-list">
        {links.map(link => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
