import React from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import Button from '../../ui/Button';
import { useNavigate } from 'react-router-dom';

const StepAccount: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          onClick={() => navigate('/login?redirect=/setup/classic')}
          variant="primary"
          className="px-8 py-3 text-lg font-semibold"
        >
          <LogIn className="w-5 h-5 mr-2" />
          Sign In
        </Button>
        <Button
          onClick={() => navigate('/signup?redirect=/setup/classic')}
          variant="secondary"
          className="px-8 py-3 text-lg font-semibold"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Sign Up
        </Button>
      </div>
    </div>
  );
};

export default StepAccount;

