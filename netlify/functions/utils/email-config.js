/**
 * Nodemailer Configuration for Netlify Functions
 * This file contains the configuration for the Nodemailer service.
 */

const nodemailer = require('nodemailer');

/**
 * Get the email transport configuration from environment variables
 * @returns {Object} Nodemailer transport configuration
 */
function getEmailConfig() {
  // Load variables from environment with defaults
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER || 'auricbysubha.web@gmail.com';
  const emailPass = process.env.EMAIL_PASS || 'vjkf sdow gkro szjx';

  console.log('Email configuration:', {
    service: emailService,
    user: emailUser ? `${emailUser.substring(0, 3)}...` : 'missing',
    pass: emailPass ? 'configured' : 'missing'
  });

  // Gmail specific configuration
  const config = {
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass.replace(/\s+/g, ''), // Remove spaces from app password
    },
    // Add debugging and connection timeout settings
    debug: false,
    logger: false,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,
    socketTimeout: 10000,
  };

  return config;
}

/**
 * Create a Nodemailer transport
 * @returns {Object} Nodemailer transport
 */
const createTransporter = () => {
  return nodemailer.createTransport(getEmailConfig());
};

module.exports = {
  createTransporter
};