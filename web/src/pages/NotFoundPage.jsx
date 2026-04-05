import {Link} from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="doc-page" dir="rtl">
      <h1>الصفحة غير موجودة</h1>
      <p>المسار الذي طلبته غير متاح.</p>
      <Link to="/" className="store-button inline-button">
        العودة إلى الرئيسية
      </Link>
    </section>
  );
}
