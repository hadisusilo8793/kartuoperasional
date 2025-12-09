// This file is obsolete and can be removed. The main entry point is now LoginPage.tsx.
// For the purpose of this exercise, we will keep it but redirect to the login page.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export function HomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login');
  }, [navigate]);
  return null; // or a loading spinner
}