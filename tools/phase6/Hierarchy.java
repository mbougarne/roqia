package roqia.testing;
import com.android.uiautomator.core.Configurator;
import com.android.uiautomator.testrunner.UiAutomatorTestCase;
/** Test-only UI snapshot: live countdowns need not become idle to be inspected. */
public class Hierarchy extends UiAutomatorTestCase {
  public void testSource() throws Exception {
    java.net.HttpURLConnection connection=(java.net.HttpURLConnection)new java.net.URL("https://www.habous.gov.ma/prieres/index.php?ville=58").openConnection();
    connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
    try {System.out.println("SOURCE_STATUS="+connection.getResponseCode());} finally {connection.disconnect();}
  }
  public void testCompletedSource() throws Exception {
    try(java.io.InputStream issuer=new java.io.FileInputStream("/data/local/tmp/habous_intermediate.pem")) {
      String html=name.roqia.app.prayer.HabousTransport.fetch("58",issuer);
      assertTrue(html.contains("horaire"));System.out.println("COMPLETED_SOURCE_BYTES="+html.length());
    }
  }
  public void testRejectTamperedLeaf() throws Exception {
    try(java.io.InputStream issuer=new java.io.FileInputStream("/data/local/tmp/habous_intermediate.pem");
        java.io.InputStream leaf=new java.io.FileInputStream("/data/local/tmp/habous-leaf.pem")) {
      java.security.cert.CertificateFactory factory=java.security.cert.CertificateFactory.getInstance("X.509");
      byte[] der=factory.generateCertificate(leaf).getEncoded();der[der.length-1]^=1;
      java.security.cert.X509Certificate tampered=(java.security.cert.X509Certificate)factory.generateCertificate(new java.io.ByteArrayInputStream(der));
      try {name.roqia.app.prayer.HabousTransport.trustManager(issuer).checkServerTrusted(new java.security.cert.X509Certificate[]{tampered},"RSA");fail("tampered signature accepted");}
      catch(java.security.cert.CertificateException expected){System.out.println("TAMPERED_CERTIFICATE_REJECTED");}
    }
  }
  public void testDump() {
    Configurator.getInstance().setWaitForIdleTimeout(0);
    sleep(200);
    getUiDevice().dumpWindowHierarchy("roqia-phase6.xml");
  }
}
