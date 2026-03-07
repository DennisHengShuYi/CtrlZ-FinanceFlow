/**
 * EMAIL SERVICE INTEGRATION
 * Now points to the Python Backend
 */

const PYTHON_API_BASE = 'http://127.0.0.1:8000/api';

export interface EmailData {
  to: string;
  subject: string;
  revenue: number;
}

export const sendThresholdAlertEmail = async (data: EmailData) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/email/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Python Email API Error:', error);
    throw error;
  }
};
