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
        <a href="#" className="store-button" aria-label="رابط Google Play placeholder">
          <FaGooglePlay size={18} />
          متجر Google Play
        </a>
        <a href="#" className="store-button" aria-label="رابط App Store placeholder">
          <FaApple size={18} />
          متجر App Store
        </a>
      </div>
    </section>
  );
}
