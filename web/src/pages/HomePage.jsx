import {FaApple, FaGooglePlay} from 'react-icons/fa';

export function HomePage() {
  return (
    <section className="hero" dir="rtl">
      <p className="kicker">مجاني • مفتوح المصدر • يعمل دون اتصال</p>
      <h1>رقية</h1>
      <p className="subtitle">
        أذكار ورقية شرعية بتجربة بسيطة وهادئة، بدون حسابات وبدون جمع بيانات.
      </p>

      <div className="store-buttons">
        <a
          href="https://play.google.com/store/apps/details?id=name.roqia.app&hl=en_US"
          className="store-button"
          aria-label="رابط Google Play placeholder">
          <FaGooglePlay size={18} />
          متجر Google Play
        </a>
        <a
          href="https://apps.apple.com/app/roqia-%D8%A7%D9%84%D8%B1%D9%82%D9%8A%D8%A9-%D8%A7%D9%84%D8%B4%D8%B1%D8%B9%D9%8A%D8%A9/id6825067887"
          className="store-button"
          aria-label="تحميل رقية من App Store">
          <FaApple size={18} />
          متجر App Store
        </a>
      </div>
    </section>
  );
}
