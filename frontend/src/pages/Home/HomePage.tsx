import React from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import HeroSection from './HeroSection';
import WaitlistSection from './WaitlistSection';
import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <HeroSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
