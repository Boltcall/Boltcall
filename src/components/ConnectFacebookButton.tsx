import React from 'react';
import Button from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { authedFetch } from '../lib/authedFetch';

interface ConnectFacebookButtonProps {
  onClick?: () => void;
  className?: string;
}

const ConnectFacebookButton: React.FC<ConnectFacebookButtonProps> = ({
  onClick,
  className = ""
}) => {
  const { user } = useAuth();

  const handleConnect = async () => {
    try {
      const userId = user?.id || '';
      const response = await authedFetch(`/.netlify/functions/facebook-auth-start?user_id=${encodeURIComponent(userId)}`);
      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        console.error('No OAuth URL received');
      }
    } catch (error) {
      console.error('Error starting Facebook OAuth:', error);
    }

    // Call the optional onClick prop if provided
    if (onClick) {
      onClick();
    }
  };

  return (
    <Button 
      onClick={handleConnect}
      className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
    >
      Connect Facebook
    </Button>
  );
};

export default ConnectFacebookButton;
