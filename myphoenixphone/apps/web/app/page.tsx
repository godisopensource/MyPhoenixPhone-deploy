import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { DemoBanner } from "./components/DemoBanner";

export default function Home() {
  return (
    <>
      <DemoBanner />
      
      <header className="navbar navbar-dark bg-dark" role="navigation">
        <div className="container-xxl">
          <div className="navbar-brand">
            <Link href="/" className="stretched-link">
              <img
                src="https://boosted.orange.com/docs/5.3/assets/brand/orange-logo.svg"
                width={50}
                height={50}
                alt="Orange"
                loading="lazy"
              />
            </Link>
            <span className="ms-3 h4 text-white">MyPhoenixPhone</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className="bg-light py-5 w-100">
          <div className="container-xxl">
            <div className="row align-items-center">
              <div className="col-lg-6">
                <h1 className="display-4 fw-bold mb-3">Secure Number Verification</h1>
                <p className="lead mb-4 text-muted">
                  Verify your phone number with Orange's secure OAuth flow and
                  network-grade checks.
                </p>
                <Link href="/consent" className="btn btn-primary btn-lg">
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer bg-dark mt-5">
        <div className="container-xxl py-4">
          <p className="mb-0 text-muted text-center">© 2025 MyPhoenixPhone — Powered by Orange</p>
        </div>
      </footer>
    </>
  );
}
