
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif',
    },
    title: {
      fontSize: '2.5rem',
      color: '#333',
      marginBottom: '20px',
    },
    buttonContainer: {
      display: 'flex',
      gap: '20px',
    },
    button: {
      padding: '10px 20px',
      fontSize: '1rem',
      color: '#fff',
      backgroundColor: '#007bff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      textDecoration: 'none',
    },
    buttonHover: {
      backgroundColor: '#0056b3',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tasks Tracker Project</h1>
      <div style={styles.buttonContainer}>
        <Link to="/auth" style={styles.button} onMouseOver={(e) => e.target.style.backgroundColor = styles.buttonHover.backgroundColor} onMouseOut={(e) => e.target.style.backgroundColor = styles.button.backgroundColor}>
          Login
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
