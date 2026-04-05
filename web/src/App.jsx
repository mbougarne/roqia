import {Navigate, Route, Routes} from 'react-router-dom';

import {Layout} from './components/Layout';
import {AboutPage} from './pages/AboutPage';
import {HomePage} from './pages/HomePage';
import {NotFoundPage} from './pages/NotFoundPage';
import {PrivacyPage} from './pages/PrivacyPage';
import {TermsPage} from './pages/TermsPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
