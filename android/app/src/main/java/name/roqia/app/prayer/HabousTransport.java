package name.roqia.app.prayer;

import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.cert.*;
import java.util.*;

import javax.net.ssl.*;

import android.net.http.X509TrustManagerExtensions;

/** Complete the public server's missing intermediate; the system still decides trust. */
public final class HabousTransport {
  private static final String HOST = "www.habous.gov.ma";

  public static X509TrustManager trustManager(InputStream issuer) throws Exception {
    X509Certificate intermediate =
        (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(issuer);
    TrustManagerFactory factory =
        TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
    factory.init((KeyStore) null);
    X509TrustManager system = null;
    for (TrustManager candidate : factory.getTrustManagers())
      if (candidate instanceof X509TrustManager) system = (X509TrustManager) candidate;
    if (system == null) throw new CertificateException("system_trust_unavailable");
    final X509TrustManager trusted = system;
    final X509TrustManagerExtensions hostTrust = new X509TrustManagerExtensions(trusted);
    X509TrustManager completion =
        new X509TrustManager() {
          @Override
          public X509Certificate[] getAcceptedIssuers() {
            return trusted.getAcceptedIssuers();
          }

          @Override
          public void checkClientTrusted(X509Certificate[] chain, String auth)
              throws CertificateException {
            trusted.checkClientTrusted(chain, auth);
          }

          @Override
          public void checkServerTrusted(X509Certificate[] chain, String auth)
              throws CertificateException {
            try {
              hostTrust.checkServerTrusted(chain, auth, HOST);
            } catch (CertificateException missing) {
              // This certificate is an untrusted chain candidate, never a new trust anchor.
              X509Certificate[] completed = Arrays.copyOf(chain, chain.length + 1);
              completed[chain.length] = intermediate;
              hostTrust.checkServerTrusted(completed, auth, HOST);
            }
          }
        };
    return completion;
  }

  public static String fetch(String city, InputStream issuer) throws Exception {
    if (!city.matches("[0-9]{1,3}")) throw new IllegalArgumentException("invalid_city");
    SSLContext tls = SSLContext.getInstance("TLS");
    tls.init(null, new TrustManager[] {trustManager(issuer)}, null);
    HttpsURLConnection connection =
        (HttpsURLConnection)
            new URL("https://" + HOST + "/prieres/index.php?ville=" + city).openConnection();
    connection.setSSLSocketFactory(tls.getSocketFactory());
    // Keep the default hostname verifier; reject redirects to another source.
    connection.setInstanceFollowRedirects(false);
    connection.setConnectTimeout(15000);
    connection.setReadTimeout(15000);
    try {
      if (connection.getResponseCode() != 200) throw new IOException("source_unavailable");
      try (InputStream input = connection.getInputStream();
          ByteArrayOutputStream output = new ByteArrayOutputStream()) {
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) {
          if (output.size() + read > 256000) throw new IOException("source_too_large");
          output.write(buffer, 0, read);
        }
        return output.toString(StandardCharsets.UTF_8.name());
      }
    } finally {
      connection.disconnect();
    }
  }
}
