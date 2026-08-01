import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Phone, Building2, Users, MessageSquare, Plug } from 'lucide-react';

const Dashboard: React.FC = () => {
  // Mock setup steps - in real app this would come from API
  const setupSteps = [
    {
      id: 1,
      title: 'Add Phone Number',
      description: 'Get a phone number for your AI receptionist',
      icon: <Phone className="w-5 h-5" />,
      completed: false,
      link: '/dashboard/phone'
    },
    {
      id: 2,
      title: 'Create Knowledge Base',
      description: 'Add information about your business and services',
      icon: <Building2 className="w-5 h-5" />,
      completed: false,
      link: '/dashboard/knowledge'
    },
    {
      id: 3,
      title: 'Set Up Agents',
      description: 'Configure your AI receptionist agents',
      icon: <Users className="w-5 h-5" />,
      completed: false,
      link: '/dashboard/agents'
    },
    {
      id: 4,
      title: 'Configure SMS',
      description: 'Enable SMS messaging for your customers',
      icon: <MessageSquare className="w-5 h-5" />,
      completed: false,
      link: '/dashboard/sms'
    },
    {
      id: 6,
      title: 'Connect Integrations',
      description: 'Link your favorite tools and services',
      icon: <Plug className="w-5 h-5" />,
      completed: false,
      link: '/dashboard/integrations'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Complete your setup to get started with Boltcall</p>
        </div>
      </motion.div>

      {/* Setup Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Setup Checklist</h2>
        
        <div className="space-y-4">
          {setupSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Circle className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <div className="text-gray-600">
                    {step.icon}
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  {step.completed ? 'Completed' : 'Set Up'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone Numbers</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Knowledge Articles</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;