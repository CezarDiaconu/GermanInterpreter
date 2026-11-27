CREATE DATABASE IF NOT EXISTS german_live
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE german_live;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  groq_api_key VARCHAR(255) DEFAULT NULL,
  groq_model VARCHAR(100) DEFAULT 'llama-3.1-8b-instant',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  german_text TEXT NOT NULL,
  english_text TEXT NOT NULL,
  topic VARCHAR(64) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_translations_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
