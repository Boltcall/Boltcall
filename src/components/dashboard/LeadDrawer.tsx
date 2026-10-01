import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, Calendar, User, MessageSquare } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { Lead } from '../../types/dashboard';
import { useIndustry } from '../../hooks/useIndustry';

interface LeadDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatChannel = (channel: string) => {
  return channel.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LeadDrawer: React.FC<LeadDrawerProps> = ({ lead, isOpen, onClose }) => {
  const { words } = useIndustry();
  const Appointment = words.appointment.charAt(0).toUpperCase() + words.appointment.slice(1);
  if (!lead) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-text-main">Lead Details</h2>
                <Button onClick={onClose} variant="outline" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Info */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-text-main mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-text-muted mr-3" />
                      <span className="text-text-main">{lead.name || 'N/A'}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-text-muted mr-3" />
                        <span className="text-text-main">{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-text-muted mr-3" />
                        <span className="text-text-main">{lead.email}</span>
                      </div>
                    )}
                  </div>
                </Card>
                
                {/* Lead Details */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-text-main mb-4">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-text-muted">Channel</label>
                      <p className="text-text-main">{formatChannel(lead.channel)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-text-muted">Source</label>
                      <p className="text-text-main">{lead.source || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-text-muted">Intent</label>
                      <p className="text-text-main capitalize">{lead.intent}</p>
                    </div>
                    <div>
                      <label className="text-sm text-text-muted">Owner</label>
                      <p className="text-text-main">{lead.owner || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-text-muted">First Reply</label>
                      <p className="text-text-main">
                        {lead.firstReplySec ? `${lead.firstReplySec}s` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-text-muted">Created</label>
                      <p className="text-text-main">{formatDate(lead.createdAt)}</p>
                    </div>
                  </div>
                </Card>
                
                {/* Status */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-text-main mb-4">Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <span className="text-sm text-text-muted mr-2">Qualified:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        lead.qualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {lead.qualified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-text-muted mr-2">Booked:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        lead.booked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {lead.booked ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {lead.bookingAt && (
                      <div className="flex items-center col-span-2">
                        <Calendar className="w-4 h-4 text-text-muted mr-2" />
                        <span className="text-sm text-text-muted">Booking Time:</span>
                        <span className="text-text-main ml-2">{formatDate(lead.bookingAt)}</span>
                      </div>
                    )}
                    {lead.showed !== undefined && (
                      <div className="flex items-center col-span-2">
                        <span className="text-sm text-text-muted mr-2">Showed:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lead.showed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {lead.showed ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
                
                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-medium text-text-main mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}
                
                {/* Last Message */}
                {lead.lastMessage && (
                  <Card className="p-4">
                    <h3 className="text-lg font-medium text-text-main mb-4">Last Message</h3>
                    <div className="flex items-start">
                      <MessageSquare className="w-4 h-4 text-text-muted mr-3 mt-1" />
                      <p className="text-text-main">{lead.lastMessage}</p>
                    </div>
                  </Card>
                )}
                
                {/* Timeline */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-text-main mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-brand-blue rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm text-text-main">Lead created</p>
                        <p className="text-xs text-text-muted">{formatDate(lead.createdAt)}</p>
                      </div>
                    </div>
                    {lead.firstReplySec && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <div>
                          <p className="text-sm text-text-main">First reply sent</p>
                          <p className="text-xs text-text-muted">{lead.firstReplySec}s after creation</p>
                        </div>
                      </div>
                    )}
                    {lead.qualified && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                        <div>
                          <p className="text-sm text-text-main">Lead qualified</p>
                          <p className="text-xs text-text-muted">Marked as qualified</p>
                        </div>
                      </div>
                    )}
                    {lead.booked && lead.bookingAt && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                        <div>
                          <p className="text-sm text-text-main">{Appointment} booked</p>
                          <p className="text-xs text-text-muted">{formatDate(lead.bookingAt)}</p>
                        </div>
                      </div>
                    )}
                    {lead.showed !== undefined && (
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          lead.showed ? 'bg-green-600' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm text-text-main">
                            {lead.showed ? `${Appointment} attended` : `${Appointment} missed`}
                          </p>
                          <p className="text-xs text-text-muted">
                            {lead.showed ? 'Client showed up' : 'No-show'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-text-muted">
                    Lead ID: {lead.id}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Edit Lead
                    </Button>
                    <Button variant="primary" size="sm">
                      Take Action
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeadDrawer;
