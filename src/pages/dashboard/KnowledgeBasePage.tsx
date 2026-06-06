import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeBaseSkeleton } from '../../components/ui/loading-skeleton';
import { X, FileText, Edit, Trash2, Save, Upload, Globe, PenTool, Plus, ChevronDown, ChevronRight, FolderOpen, Building2, Pencil, ArrowLeft } from 'lucide-react';
import ModalShell from '../../components/ui/modal-shell';

import { FileUpload } from '@/components/ui/file-upload';
import CardTableWithPanel from '../../components/ui/CardTableWithPanel';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokens } from '../../contexts/TokenContext';
import { CheckCircle2, Circle, Sparkles, ArrowRight } from 'lucide-react';
import { PopButton } from '../../components/ui/pop-button';

import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';

interface KbFolder {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_default: boolean;
  doc_count: number;
  agents: Array<{ agent_id: string; agent_name: string }>;
}

interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface KnowledgeBaseDocument {
  id: string;
  name: string;
  type: 'url' | 'file' | 'text';
  content?: string;
  url?: string;
  file?: File;
}

// Industry-specific placeholder helpers
function getServicePlaceholder(industry: string): string {
  const map: Record<string, string> = {
    'Plumbing': 'e.g. Emergency repairs — $150 call-out\nDrain cleaning — $120\nBoiler installation — from $2,500',
    'HVAC': 'e.g. AC tune-up — $89\nFurnace repair — $150+\nDuct cleaning — $299',
    'Dental': 'e.g. Teeth cleaning — $120\nWhitening — $350\nCrown — $800-$1,200',
    'Roofing': 'e.g. Roof inspection — Free\nShingle repair — $300+\nFull replacement — from $8,000',
    'Landscaping': 'e.g. Weekly lawn care — $50/visit\nTree trimming — $200+\nHardscaping — custom quote',
  };
  return map[industry] || 'List your services, one per line. Include prices if possible.\ne.g. Service A — $100\nService B — $250';
}

function getFaqPlaceholder(industry: string): string {
  const map: Record<string, string> = {
    'Plumbing': 'e.g. Q: Do you offer emergency service?\nA: Yes, we offer 24/7 emergency plumbing.\n\nQ: How quickly can you come out?\nA: Same-day for emergencies, next-day for standard jobs.',
    'HVAC': 'e.g. Q: How often should I service my AC?\nA: Once a year, ideally before summer.\n\nQ: Do you offer financing?\nA: Yes, 0% financing on systems over $3,000.',
    'Dental': 'e.g. Q: Do you accept insurance?\nA: Yes, we accept most major dental plans.\n\nQ: Do you offer payment plans?\nA: Yes, we offer flexible payment options.',
  };
  return map[industry] || 'Write your most common Q&As, one per line.\ne.g. Q: Do you offer free quotes?\nA: Yes, all quotes are free with no obligation.';
}

function getPolicyPlaceholder(_industry: string): string {
  return 'e.g. Cancellation: 24-hour notice required or $50 fee\nRefunds: Full refund if not satisfied within 7 days\nDeposit: 50% deposit required for jobs over $500\nRescheduling: Free rescheduling with 12-hour notice';
}

const KnowledgeBasePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { claimReward } = useTokens();
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<'url' | 'file' | 'blank' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [blankPageTitle, setBlankPageTitle] = useState('');
  
  // New Knowledge Base Modal state
  const [showNewKnowledgeBaseModal, setShowNewKnowledgeBaseModal] = useState(false);
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('');
  const [kbDocuments, setKbDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [showKbDocumentDropdown, setShowKbDocumentDropdown] = useState(false);
  const kbDropdownRef = useRef<HTMLDivElement>(null);

  // KB Setup form state (for New KB modal)
  const [kbWebsiteUrl, setKbWebsiteUrl] = useState('');
  const [kbScanning, setKbScanning] = useState(false);
  const [kbServices, setKbServices] = useState<Array<{ name: string; duration: number; price: number }>>([]);
  const [kbFaqs, setKbFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [kbPolicies, setKbPolicies] = useState({ cancellation: '', reschedule: '', deposit: '' });

  // Folder picker in popup modals
  const [popupFolderId, setPopupFolderId] = useState<string | null>(null);
  const [showNewFolderInline, setShowNewFolderInline] = useState(false);
  const [inlineNewFolderName, setInlineNewFolderName] = useState('');

  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Document management state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingDocumentContent, setEditingDocumentContent] = useState('');
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null);

  // KB Folders state
  const [folders, setFolders] = useState<KbFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');

  // Fetch KB folders
  const fetchFolders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_folders', userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  }, [user?.id]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user?.id) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_folder', userId: user.id, name: newFolderName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast({ title: 'Folder created', message: `"${newFolderName}" is ready`, variant: 'success', duration: 3000 });
        setNewFolderName('');
        setShowCreateFolderModal(false);
        await fetchFolders();
        setSelectedFolderId(data.folder?.id || null);
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to create folder', variant: 'error', duration: 3000 });
    }
  };


  const handleDeleteFolder = async (folderId: string) => {
    if (!user?.id) return;
    try {
      await authedFetch(`${FUNCTIONS_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_folder', userId: user.id, folderId, deleteDocs: false }),
      });
      showToast({ title: 'Folder deleted', message: 'Documents moved to unassigned', variant: 'success', duration: 3000 });
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      fetchFolders();
      fetchDocuments();
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to delete folder', variant: 'error', duration: 3000 });
    }
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    if (!name.trim() || !user?.id) return;
    try {
      await authedFetch(`${FUNCTIONS_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_folder', userId: user.id, folderId, name: name.trim() }),
      });
      setRenamingFolderId(null);
      fetchFolders();
    } catch {
      showToast({ title: 'Error', message: 'Failed to rename folder', variant: 'error', duration: 3000 });
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId) || null;

  // KB Completeness state
  const [kbCompleteness, setKbCompleteness] = useState<{
    score: number;
    items: Array<{ label: string; hint: string; done: boolean }>;
  }>({ score: 0, items: [] });

  const [progressExpanded, setProgressExpanded] = useState(false);

  // Fill the Gaps quiz state
  const [showGapsQuiz, setShowGapsQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSaving, setQuizSaving] = useState(false);
  const [businessIndustry, setBusinessIndustry] = useState('');

  // Generate quiz questions based on missing KB items and industry
  const getQuizQuestions = () => {
    const missing = kbCompleteness.items.filter(i => !i.done);
    const industry = businessIndustry || 'your business';
    const questions: Array<{ key: string; label: string; question: string; placeholder: string; multiline?: boolean }> = [];

    for (const item of missing) {
      if (item.label === 'Business name') {
        questions.push({
          key: 'business_name',
          label: 'Business Name',
          question: `What is the name of your ${industry} business?`,
          placeholder: `e.g. Smith's ${industry} Services`,
        });
      } else if (item.label === 'Website URL') {
        questions.push({
          key: 'website_url',
          label: 'Website URL',
          question: `What is your ${industry} business website? Your AI will auto-learn from it.`,
          placeholder: 'e.g. https://www.mybusiness.com',
        });
      } else if (item.label === 'Services') {
        questions.push({
          key: 'services',
          label: 'Services & Pricing',
          question: `What services does your ${industry} business offer? Include prices if possible.`,
          placeholder: getServicePlaceholder(industry),
          multiline: true,
        });
      } else if (item.label === 'FAQs') {
        questions.push({
          key: 'faqs',
          label: 'Frequently Asked Questions',
          question: `What questions do your ${industry} customers ask most often?`,
          placeholder: getFaqPlaceholder(industry),
          multiline: true,
        });
      } else if (item.label === 'Policies') {
        questions.push({
          key: 'policies',
          label: 'Business Policies',
          question: `What are your ${industry} business policies? (cancellation, refunds, deposits, rescheduling)`,
          placeholder: getPolicyPlaceholder(industry),
          multiline: true,
        });
      }
    }
    return questions;
  };

  // Fetch industry on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('business_profiles')
      .select('main_category')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.main_category) setBusinessIndustry(data.main_category);
      });
  }, [user?.id]);

  // Save quiz answers as KB documents
  const handleQuizSave = async () => {
    if (!user?.id || !businessProfileId) return;
    setQuizSaving(true);
    try {
      const entries: Array<{ title: string; content: string; content_type: string; tags: string[] }> = [];

      if (quizAnswers.business_name?.trim()) {
        await supabase
          .from('business_profiles')
          .update({ business_name: quizAnswers.business_name.trim() })
          .eq('user_id', user.id);
      }

      if (quizAnswers.website_url?.trim()) {
        await supabase
          .from('business_profiles')
          .update({ website_url: quizAnswers.website_url.trim() })
          .eq('user_id', user.id);
      }

      if (quizAnswers.services?.trim()) {
        entries.push({
          title: 'Services & Pricing',
          content: quizAnswers.services.trim(),
          content_type: 'product_info',
          tags: ['service', 'pricing'],
        });
      }

      if (quizAnswers.faqs?.trim()) {
        entries.push({
          title: 'Frequently Asked Questions',
          content: quizAnswers.faqs.trim(),
          content_type: 'faq',
          tags: ['faq', 'question'],
        });
      }

      if (quizAnswers.policies?.trim()) {
        entries.push({
          title: 'Business Policies',
          content: quizAnswers.policies.trim(),
          content_type: 'policy',
          tags: ['policy', 'cancellation', 'refund'],
        });
      }

      for (const entry of entries) {
        await supabase.from('knowledge_base').insert({
          user_id: user.id,
          business_profile_id: businessProfileId,
          title: entry.title,
          content: entry.content,
          content_type: entry.content_type,
          tags: entry.tags,
          status: 'active',
          priority: 3,
          kb_folder_id: selectedFolderId || null,
        });
      }

      showToast({ message: 'Knowledge base updated!', variant: 'success' });
      setShowGapsQuiz(false);
      setQuizStep(0);
      setQuizAnswers({});
      fetchDocuments();
      fetchCompleteness();
      syncToRetell();
    } catch (error) {
      console.error('Error saving quiz answers:', error);
      showToast({ message: 'Failed to save — try again', variant: 'error' });
    } finally {
      setQuizSaving(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (kbDropdownRef.current && !kbDropdownRef.current.contains(event.target as Node)) {
        setShowKbDocumentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fetch documents from Supabase (filtered by selected folder)
  const fetchDocuments = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', user.id);

      if (selectedFolderId) {
        query = query.eq('kb_folder_id', selectedFolderId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      // Transform Supabase data to Document interface
      const transformedDocuments: Document[] = (data || []).map((doc: any) => ({
        id: doc.id,
        name: doc.title || 'Untitled',
        content: doc.content || '',
        createdAt: new Date(doc.created_at || new Date()),
        updatedAt: new Date(doc.updated_at || doc.created_at || new Date())
      }));

      setDocuments(transformedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch KB completeness data from Supabase
  const fetchCompleteness = async () => {
    if (!user?.id) return;
    try {
      // Fetch business profile
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('business_name, website_url')
        .eq('user_id', user.id)
        .single();

      // Fetch KB docs to check categories
      const { data: kbDocs } = await supabase
        .from('knowledge_base')
        .select('title, content, content_type, tags, source')
        .eq('user_id', user.id);

      const docs = kbDocs || [];
      const allText = docs.map(d => `${d.title || ''} ${(d.tags || []).join(' ')}`).join(' ').toLowerCase();

      const hasBusinessName = !!profile?.business_name?.trim();
      const hasWebsite = !!profile?.website_url?.trim();
      const hasServices = allText.includes('service') || allText.includes('pricing') || allText.includes('price') || docs.some(d => (d.tags || []).some((t: string) => t.toLowerCase().includes('service')));
      const hasFaqs = allText.includes('faq') || allText.includes('question') || docs.some(d => (d.tags || []).some((t: string) => t.toLowerCase().includes('faq')));
      const hasPolicies = allText.includes('polic') || allText.includes('cancellation') || allText.includes('reschedule') || allText.includes('deposit') || allText.includes('refund');
      const hasFiles = docs.some(d => d.content_type === 'file');

      let score = 0;
      if (hasBusinessName) score += 10;
      if (hasWebsite) score += 20;
      if (hasServices) score += 20;
      if (hasFaqs) score += 20;
      if (hasPolicies) score += 15;
      if (hasFiles) score += 15;

      setKbCompleteness({
        score,
        items: [
          { label: 'Business name', hint: '', done: hasBusinessName },
          { label: 'Website URL', hint: 'AI auto-learns from your site', done: hasWebsite },
          { label: 'Services', hint: 'so AI can quote prices', done: hasServices },
          { label: 'FAQs', hint: 'instant answers to common questions', done: hasFaqs },
          { label: 'Policies', hint: 'cancellation, reschedule, deposit', done: hasPolicies },
          { label: 'Documents uploaded', hint: 'menu, brochure, etc.', done: hasFiles },
        ],
      });
    } catch (error) {
      console.error('Error fetching KB completeness:', error);
    }
  };

  // Sync KB docs to Retell agent's knowledge base
  const syncToRetell = async () => {
    if (!user?.id) return;
    try {
      // 1. Find the user's agent and its Retell KB ID
      const { data: agent } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('user_id', user.id)
        .not('retell_agent_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (!agent?.retell_agent_id) return; // No Retell agent yet — skip

      // 2. Get the agent details from Retell to find KB ID
      const agentRes = await authedFetch(`${FUNCTIONS_BASE}/retell-agents?agent_id=${agent.retell_agent_id}`);
      if (!agentRes.ok) return;
      const agentData = await agentRes.json();

      // Find KB ID from the agent's LLM config
      const llmId = agentData.response_engine?.llm_id;
      if (!llmId) return;

      // Get LLM to find knowledge_base_ids
      const llmRes = await authedFetch(`${FUNCTIONS_BASE}/retell-agents?llm_id=${llmId}`);
      if (!llmRes.ok) return;
      const llmData = await llmRes.json();
      const kbId = llmData.knowledge_base_ids?.[0];
      if (!kbId) return;

      // 3. Get all current KB docs from Supabase
      const { data: docs } = await supabase
        .from('knowledge_base')
        .select('title, content')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!docs?.length) return;

      // 4. Push to Retell KB via sync_kb action
      await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_kb',
          knowledge_base_id: kbId,
          knowledge_base_texts: docs.map(d => ({
            title: d.title || 'Untitled',
            text: d.content || '',
          })),
        }),
      });

      console.log('KB synced to Retell successfully');
    } catch (error) {
      console.error('Failed to sync KB to Retell:', error);
    }
  };

  // Fetch business profile ID for inserts
  const fetchBusinessProfileId = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (data?.id) setBusinessProfileId(data.id);
  };

  useEffect(() => {
    fetchFolders();
    fetchDocuments();
    fetchCompleteness();
    fetchBusinessProfileId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Refetch documents when folder selection changes
  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  // KB website scan handler
  const handleKbScanWebsite = async () => {
    const url = kbWebsiteUrl.trim();
    if (!url) return;
    setKbScanning(true);
    try {
      showToast({ title: 'Scanning website...', message: 'AI is reading your website to auto-fill services & FAQs', variant: 'default', duration: 15000 });
      const res = await fetch(`${FUNCTIONS_BASE}/scrape-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const scraped = await res.json();
      const content = scraped.markdown || scraped.content || '';
      if (!content || content.length < 50) {
        showToast({ title: 'Low content', message: 'Could not extract much. Try adding info manually.', variant: 'error', duration: 4000 });
        setKbScanning(false);
        return;
      }
      const extractRes = await authedFetch(`${FUNCTIONS_BASE}/ai-extract-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, businessName: knowledgeBaseName, category: businessIndustry, userId: user!.id }),
      });
      if (extractRes.ok) {
        const extracted = await extractRes.json();
        if (extracted.services?.length) setKbServices(extracted.services);
        if (extracted.faqs?.length) setKbFaqs(extracted.faqs);
        if (extracted.policies) {
          setKbPolicies(prev => ({
            cancellation: extracted.policies.cancellation || prev.cancellation,
            reschedule: extracted.policies.reschedule || prev.reschedule,
            deposit: extracted.policies.deposit || prev.deposit,
          }));
        }
        const parts: string[] = [];
        if (extracted.services?.length) parts.push(`${extracted.services.length} services`);
        if (extracted.faqs?.length) parts.push(`${extracted.faqs.length} FAQs`);
        showToast({ title: 'Website scanned!', message: parts.length > 0 ? `Found ${parts.join(', ')}. Review below.` : 'No structured data found.', variant: parts.length > 0 ? 'success' : 'default', duration: 5000 });
      }
    } catch {
      showToast({ title: 'Scan failed', message: 'Could not scan website. Add info manually.', variant: 'error', duration: 4000 });
    } finally {
      setKbScanning(false);
    }
  };

  // New Knowledge Base handlers
  const handleCloseNewKnowledgeBase = () => {
    setShowNewKnowledgeBaseModal(false);
    setKnowledgeBaseName('');
    setKbDocuments([]);
    setShowKbDocumentDropdown(false);
    setUrlInput('');
    setFileInput(null);
    setBlankPageTitle('');
    setPopupType(null);
    setKbWebsiteUrl('');
    setKbScanning(false);
    setKbServices([]);
    setKbFaqs([]);
    setKbPolicies({ cancellation: '', reschedule: '', deposit: '' });
  };

  const handleAddKbDocument = () => {
    setShowKbDocumentDropdown(!showKbDocumentDropdown);
  };

  const handleKbAddWebsite = () => {
    setShowKbDocumentDropdown(false);
    setPopupType('url');
    setShowPopup(true);
  };

  const handleKbAddFile = () => {
    setShowKbDocumentDropdown(false);
    setPopupType('file');
    setShowPopup(true);
  };

  const handleKbAddText = () => {
    setShowKbDocumentDropdown(false);
    setPopupType('blank');
    setShowPopup(true);
  };

  const handleRemoveKbDocument = (id: string) => {
    setKbDocuments(kbDocuments.filter(doc => doc.id !== id));
  };

  const handleSaveNewKnowledgeBase = async () => {
    if (!knowledgeBaseName.trim() || !user?.id || !businessProfileId) {
      showToast({
        title: 'Error',
        message: !businessProfileId ? 'Please complete your business profile first' : 'Please enter a knowledge base name',
        variant: 'error',
        duration: 3000
      });
      return;
    }

    try {
      showToast({ title: 'Saving...', message: 'Creating folder & processing documents...', variant: 'default', duration: 10000 });

      // Create a KB folder first
      const folderRes = await authedFetch(`${FUNCTIONS_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_folder', userId: user.id, name: knowledgeBaseName.trim() }),
      });
      let newFolderId: string | null = null;
      if (folderRes.ok) {
        const folderData = await folderRes.json();
        newFolderId = folderData.folder?.id || null;
      }

      // Process each document - scrape URLs and read files
      const documentsToInsert = await Promise.all(kbDocuments.map(async (doc) => {
        let content = doc.content || '';
        let title = doc.name;

        if (doc.type === 'url' && doc.url) {
          try {
            const res = await fetch('/.netlify/functions/scrape-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: doc.url }),
            });
            const scraped = await res.json();
            content = scraped.content || `Imported from: ${doc.url}`;
            title = scraped.title || doc.name;
          } catch {
            content = `Failed to scrape. URL: ${doc.url}`;
          }
        } else if (doc.type === 'file' && doc.file) {
          try {
            content = await doc.file.text();
          } catch {
            content = `Failed to read file: ${doc.file.name}`;
          }
        }

        return {
          user_id: user.id,
          business_profile_id: businessProfileId,
          title,
          content,
          content_type: doc.type === 'file' ? 'file' : 'text',
          status: 'active',
          tags: [knowledgeBaseName.trim()],
          kb_folder_id: newFolderId,
          source: doc.type === 'url' ? doc.url : doc.type === 'file' ? doc.file?.name : 'manual'
        };
      }));

      // Add KB entries from services/FAQs/policies
      if (kbServices.length > 0) {
        const servicesContent = kbServices
          .map(s => `${s.name} — ${s.duration} min — $${s.price}`)
          .join('\n');
        documentsToInsert.push({
          user_id: user.id,
          business_profile_id: businessProfileId,
          title: 'Services & Pricing',
          content: servicesContent,
          content_type: 'text',
          status: 'active',
          tags: [knowledgeBaseName.trim()],
          kb_folder_id: newFolderId,
          source: 'manual'
        });
      }

      if (kbFaqs.length > 0) {
        const faqsContent = kbFaqs
          .map(f => `Q: ${f.question}\nA: ${f.answer}`)
          .join('\n\n');
        documentsToInsert.push({
          user_id: user.id,
          business_profile_id: businessProfileId,
          title: 'Frequently Asked Questions',
          content: faqsContent,
          content_type: 'text',
          status: 'active',
          tags: [knowledgeBaseName.trim()],
          kb_folder_id: newFolderId,
          source: 'manual'
        });
      }

      if (kbPolicies.cancellation.trim() || kbPolicies.reschedule.trim() || kbPolicies.deposit.trim()) {
        const policyParts: string[] = [];
        if (kbPolicies.cancellation.trim()) policyParts.push(`Cancellation: ${kbPolicies.cancellation.trim()}`);
        if (kbPolicies.reschedule.trim()) policyParts.push(`Reschedule: ${kbPolicies.reschedule.trim()}`);
        if (kbPolicies.deposit.trim()) policyParts.push(`Deposit/Payment: ${kbPolicies.deposit.trim()}`);
        documentsToInsert.push({
          user_id: user.id,
          business_profile_id: businessProfileId,
          title: 'Business Policies',
          content: policyParts.join('\n\n'),
          content_type: 'text',
          status: 'active',
          tags: [knowledgeBaseName.trim()],
          kb_folder_id: newFolderId,
          source: 'manual'
        });
      }

      if (documentsToInsert.length === 0) {
        showToast({
          title: 'Success',
          message: 'Knowledge base folder created',
          variant: 'success',
          duration: 3000
        });
        handleCloseNewKnowledgeBase();
        fetchFolders();
        fetchDocuments();
        syncToRetell();
        return;
      }

      const { error } = await supabase
        .from('knowledge_base')
        .insert(documentsToInsert)
        .select();

      if (error) {
        console.error('Error creating knowledge base:', error);
        showToast({
          title: 'Error',
          message: 'Failed to create knowledge base',
          variant: 'error',
          duration: 3000
        });
        return;
      }

      showToast({
        title: 'Success',
        message: 'Knowledge base created successfully',
        variant: 'success',
        duration: 3000
      });

      // Claim bonus token rewards
      const addDocResult = await claimReward('add_first_kb_document');
      if (addDocResult?.success && !addDocResult?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+30 tokens earned for adding your first KB document', variant: 'success', duration: 4000 });
      }
      // Check if any doc was a file upload
      const hasFileUpload = kbDocuments.some(d => d.type === 'file');
      if (hasFileUpload) {
        const fileResult = await claimReward('upload_first_file');
        if (fileResult?.success && !fileResult?.alreadyClaimed) {
          showToast({ title: 'Bonus Tokens!', message: '+20 tokens earned for uploading your first file', variant: 'success', duration: 4000 });
        }
      }

      handleCloseNewKnowledgeBase();
      fetchFolders();
      fetchDocuments();
      syncToRetell();
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      showToast({
        title: 'Error',
        message: 'Failed to create knowledge base',
        variant: 'error',
        duration: 3000
      });
    }
  };

  // URL submission - scrapes content and saves to Supabase
  const handleSubmitUrl = async () => {
    if (!urlInput.trim()) return;

    if (showNewKnowledgeBaseModal) {
      // Modal mode: add to local list for batch save
      setKbDocuments([...kbDocuments, {
        id: Date.now().toString(),
        name: `Website: ${urlInput}`,
        type: 'url',
        url: urlInput
      }]);
      setUrlInput('');
      setShowPopup(false);
      setPopupType(null);
      return;
    }

    // Direct mode: scrape URL and save to Supabase
    if (!user?.id || !businessProfileId) {
      showToast({ title: 'Error', message: 'Please complete your business profile first', variant: 'error', duration: 3000 });
      return;
    }

    showToast({ title: 'Scraping...', message: `Fetching content from ${urlInput}`, variant: 'default', duration: 5000 });

    try {
      const res = await fetch('/.netlify/functions/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      const scraped = await res.json();

      const title = scraped.title || `Website: ${urlInput}`;
      const content = scraped.content || `Imported from: ${urlInput}`;

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert([{
          user_id: user.id,
          business_profile_id: businessProfileId,
          title,
          content,
          content_type: 'text',
          status: 'active',
          source: urlInput,
          kb_folder_id: popupFolderId || selectedFolderId || null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving URL content:', error);
        showToast({ title: 'Error', message: 'Failed to save website content', variant: 'error', duration: 3000 });
        return;
      }

      // Refresh documents if the doc belongs to the currently viewed folder
      const targetFolder = popupFolderId || selectedFolderId || null;
      if (!selectedFolderId || targetFolder === selectedFolderId) {
        setDocuments(prev => [{
          id: data.id,
          name: data.title,
          content: data.content || '',
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at || data.created_at)
        }, ...prev]);
      }
      fetchFolders();

      showToast({ title: 'Success', message: `Imported ${scraped.charCount || 0} characters from website`, variant: 'success', duration: 3000 });
      const urlDocResult = await claimReward('add_first_kb_document');
      if (urlDocResult?.success && !urlDocResult?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+30 tokens earned for adding your first KB document', variant: 'success', duration: 4000 });
      }
      handleClosePopup();
      syncToRetell();
    } catch (error) {
      console.error('Error scraping URL:', error);
      showToast({ title: 'Error', message: 'Failed to scrape website', variant: 'error', duration: 3000 });
    }
  };

  const handleFileUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      setFileInput(file);
    }
  };

  // File submission - reads file content and saves to Supabase
  const handleSubmitFile = async () => {
    if (!fileInput) return;

    if (showNewKnowledgeBaseModal) {
      // Modal mode: add to local list
      setKbDocuments([...kbDocuments, {
        id: Date.now().toString(),
        name: fileInput.name,
        type: 'file',
        file: fileInput
      }]);
      setFileInput(null);
      setShowPopup(false);
      setPopupType(null);
      return;
    }

    // Direct mode: read file and save to Supabase
    if (!user?.id || !businessProfileId) {
      showToast({ title: 'Error', message: 'Please complete your business profile first', variant: 'error', duration: 3000 });
      return;
    }

    try {
      const content = await fileInput.text();

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert([{
          user_id: user.id,
          business_profile_id: businessProfileId,
          title: fileInput.name,
          content,
          content_type: 'file',
          status: 'active',
          source: fileInput.name,
          kb_folder_id: popupFolderId || selectedFolderId || null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving file:', error);
        showToast({ title: 'Error', message: 'Failed to save file content', variant: 'error', duration: 3000 });
        return;
      }

      const targetFolder = popupFolderId || selectedFolderId || null;
      if (!selectedFolderId || targetFolder === selectedFolderId) {
        setDocuments(prev => [{
          id: data.id,
          name: data.title,
        content: data.content || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at || data.created_at)
        }, ...prev]);
      }
      fetchFolders();

      showToast({ title: 'Success', message: `File "${fileInput.name}" uploaded successfully`, variant: 'success', duration: 3000 });
      const fileDocResult = await claimReward('add_first_kb_document');
      if (fileDocResult?.success && !fileDocResult?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+30 tokens earned for adding your first KB document', variant: 'success', duration: 4000 });
      }
      const fileUploadResult = await claimReward('upload_first_file');
      if (fileUploadResult?.success && !fileUploadResult?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+20 tokens earned for uploading your first file', variant: 'success', duration: 4000 });
      }
      setFileInput(null);
      handleClosePopup();
      syncToRetell();
    } catch (error) {
      console.error('Error reading file:', error);
      showToast({ title: 'Error', message: 'Failed to read file', variant: 'error', duration: 3000 });
    }
  };

  // Blank page submission
  const handleSubmitBlankPage = async () => {
    if (!blankPageTitle.trim()) return;

    if (showNewKnowledgeBaseModal) {
      setKbDocuments([...kbDocuments, {
        id: Date.now().toString(),
        name: blankPageTitle.trim(),
        type: 'text',
        content: ''
      }]);
      setBlankPageTitle('');
      setShowPopup(false);
      setPopupType(null);
      return;
    }

    if (!user?.id || !businessProfileId) {
      showToast({ title: 'Error', message: 'Please complete your business profile first', variant: 'error', duration: 3000 });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .insert([{
          user_id: user.id,
          business_profile_id: businessProfileId,
          title: blankPageTitle.trim(),
          content: '',
          content_type: 'text',
          status: 'draft',
          kb_folder_id: popupFolderId || selectedFolderId || null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating document:', error);
        showToast({ title: 'Error', message: 'Failed to create document', variant: 'error', duration: 3000 });
        return;
      }

      const newDoc: Document = {
        id: data.id,
        name: data.title,
        content: data.content || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at || data.created_at)
      };

      setDocuments(prev => [newDoc, ...prev]);
      setBlankPageTitle('');
      handleClosePopup();
      handleEditDocument(newDoc);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupType(null);
    setUrlInput('');
    setFileInput(null);
    setBlankPageTitle('');
    setPopupFolderId(null);
    setShowNewFolderInline(false);
    setInlineNewFolderName('');
  };

  // Create folder inline from popup and select it
  const handleCreateFolderInline = async () => {
    if (!inlineNewFolderName.trim() || !user?.id) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_folder', userId: user.id, name: inlineNewFolderName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setPopupFolderId(data.folder?.id || null);
        setShowNewFolderInline(false);
        setInlineNewFolderName('');
        await fetchFolders();
      }
    } catch {
      showToast({ title: 'Error', message: 'Failed to create folder', variant: 'error', duration: 3000 });
    }
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocumentId(doc.id);
    setEditingDocumentContent(doc.content);
    setShowDocumentEditor(true);
  };

  const handleSaveDocument = async () => {
    if (editingDocumentId && user?.id) {
      try {
        const { error } = await supabase
          .from('knowledge_base')
          .update({
            content: editingDocumentContent,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDocumentId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error saving document:', error);
          return;
        }

        setDocuments(documents.map(doc => 
          doc.id === editingDocumentId 
            ? { ...doc, content: editingDocumentContent, updatedAt: new Date() } 
            : doc
        ));
        setEditingDocumentId(null);
        setEditingDocumentContent('');
        setShowDocumentEditor(false);
        syncToRetell();
      } catch (error) {
        console.error('Error saving document:', error);
      }
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting document:', error);
        return;
      }

      setDocuments(documents.filter(doc => doc.id !== id));
      syncToRetell();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingDocumentId(null);
    setEditingDocumentContent('');
    setShowDocumentEditor(false);
  };

  // Dropdown handlers
  const handleAddDocument = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUploadFiles = () => {
    setShowDropdown(false);
    setPopupType('file');
    setShowPopup(true);
  };

  const handleAddWebsite = () => {
    setShowDropdown(false);
    setPopupType('url');
    setShowPopup(true);
  };

  const handleAddText = () => {
    setShowDropdown(false);
    setPopupType('blank');
    setShowPopup(true);
  };


  if (isLoading) {
    return <KnowledgeBaseSkeleton />;
  }

  // Folder picker JSX used inside popup modals
  const folderPickerUI = (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Add to Folder</label>
      {!showNewFolderInline ? (
        <div className="flex items-center gap-2">
          <select
            value={popupFolderId || ''}
            onChange={(e) => setPopupFolderId(e.target.value || null)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No folder (unassigned)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewFolderInline(true)}
            className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 inline -mt-0.5" /> New
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inlineNewFolderName}
            onChange={(e) => setInlineNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolderInline(); if (e.key === 'Escape') setShowNewFolderInline(false); }}
            placeholder="Folder name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button type="button" onClick={handleCreateFolderInline} disabled={!inlineNewFolderName.trim()} className="px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Create</button>
          <button type="button" onClick={() => setShowNewFolderInline(false)} className="px-2 py-2 text-sm text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      {/* ─── TOP BAR: breadcrumb + actions ─── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {selectedFolderId ? (
            <>
              <button
                onClick={() => setSelectedFolderId(null)}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Folders
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{selectedFolder?.name}</span>
            </>
          ) : (
            <h2 className="text-lg font-bold text-gray-900">Knowledge Base</h2>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* New KB Dropdown — always visible */}
          <div className="relative" ref={dropdownRef}>
            <PopButton color="blue" onClick={handleAddDocument} className="gap-2">
              <span className="font-bold hidden md:inline">New Knowledge Base</span>
              <span className="font-bold md:hidden">New KB</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </PopButton>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                >
                  <div className="py-1">
                    <button onClick={handleUploadFiles} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div><div className="text-sm font-medium text-gray-900">Upload files</div><div className="text-xs text-gray-500">PDF, DOC, TXT</div></div>
                    </button>
                    <button onClick={handleAddWebsite} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div><div className="text-sm font-medium text-gray-900">Website</div><div className="text-xs text-gray-500">Import from URL</div></div>
                    </button>
                    <button onClick={handleAddText} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div><div className="text-sm font-medium text-gray-900">Add text</div><div className="text-xs text-gray-500">Create from scratch</div></div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* KB Completeness Banner — only on folder grid view */}
      {kbCompleteness.score < 100 && !selectedFolderId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Collapsed row — always visible */}
          <button
            onClick={() => setProgressExpanded(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">Setup Progress</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600" initial={{ width: 0 }} animate={{ width: `${kbCompleteness.score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
              </div>
              <span className="text-sm font-bold text-blue-600 whitespace-nowrap">{kbCompleteness.score}%</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${progressExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded detail */}
          <AnimatePresence>
            {progressExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-3">Your AI agent works better with more info:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {kbCompleteness.items.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {item.done ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <span className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{item.label}</span>
                        {item.hint && !item.done && <span className="text-xs text-gray-400">— {item.hint}</span>}
                      </div>
                    ))}
                  </div>
                  {kbCompleteness.items.some(i => !i.done && i.label !== 'Documents uploaded') && (
                    <button onClick={() => { setQuizStep(0); setQuizAnswers({}); setShowGapsQuiz(true); }} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                      <Sparkles className="w-4 h-4" /> Fill the Gaps <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── FOLDERS GRID (default view) ─── */}
      {!selectedFolderId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
              onClick={() => setSelectedFolderId(folder.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${folder.is_default ? 'bg-amber-50' : 'bg-blue-50'}`}>
                  {folder.is_default ? <Building2 className="w-5 h-5 text-amber-600" /> : <FolderOpen className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{folder.name}</div>
                  <div className="text-xs text-gray-500">{folder.doc_count} {folder.doc_count === 1 ? 'document' : 'documents'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              {/* Rename / Delete on hover */}
              {!folder.is_default && (
                <div className="hidden group-hover:flex absolute top-2 right-2 items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); setRenamingFolderName(folder.name); setShowCreateFolderModal(true); }} className="p-1 rounded hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${folder.name}"? Documents will be moved to unassigned.`)) handleDeleteFolder(folder.id); }} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              )}
            </div>
          ))}
          {/* Add New Folder placeholder — fills empty grid slots */}
          <button
            onClick={() => setShowNewFolderInline(true)}
            className="group relative bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-5 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-blue-100 transition-colors">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-400 group-hover:text-blue-600 transition-colors">New Folder</div>
              <div className="text-xs text-gray-400">Organize your documents</div>
            </div>
          </button>
          {folders.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">No folders yet. Create one to organize your knowledge base.</div>
          )}
        </div>
      )}

      {/* ─── DOCUMENTS TABLE (inside a folder) ─── */}
      {selectedFolderId && (
        <div className="bg-white rounded-lg shadow-sm">
          {/* Search */}
          <div className="p-3 md:p-6">
            <div className="relative md:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input type="text" placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <CardTableWithPanel
            hideSearch={true}
            data={documents.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.content.toLowerCase().includes(searchTerm.toLowerCase()))}
            columns={[
              { key: 'name', label: 'Document Name', width: '25%' },
              { key: 'content', label: 'Content Preview', width: '35%' },
              { key: 'createdAt', label: 'Created', width: '15%' },
              { key: 'updatedAt', label: 'Updated', width: '15%' },
              { key: 'actions', label: 'Actions', width: '10%' }
            ]}
            renderRow={(doc) => (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
                <div className="flex items-center justify-between md:contents">
                  <div className="flex items-center gap-3 md:flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-blue-600" /></div>
                    <div className="font-medium text-gray-900 truncate">{doc.name}</div>
                  </div>
                  <div className="flex items-center gap-3 md:hidden flex-shrink-0">
                    <button onClick={() => handleEditDocument(doc)} className="text-blue-600 hover:text-blue-900 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600 hover:text-red-900 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 md:flex-1 truncate">{doc.content.substring(0, 50)}...</div>
                <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500 md:contents">
                  <div className="md:flex-1"><span className="md:hidden">Created: </span>{doc.createdAt.toLocaleDateString()}</div>
                  <div className="md:flex-1"><span className="md:hidden">Updated: </span>{doc.updatedAt.toLocaleDateString()}</div>
                </div>
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleEditDocument(doc)} className="text-blue-600 hover:text-blue-900 transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600 hover:text-red-900 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            emptyStateText="No documents in this folder"
            emptyStateAnimation="/No_Data_Preview.lottie"
          />
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* New Knowledge Base Modal */}
      <ModalShell
        open={showNewKnowledgeBaseModal}
        onClose={handleCloseNewKnowledgeBase}
        title="Add Knowledge Base"
        maxWidth="max-w-2xl"
        footer={
          <>
            <PopButton onClick={handleCloseNewKnowledgeBase}>Cancel</PopButton>
            <PopButton color="blue" onClick={handleSaveNewKnowledgeBase} disabled={!knowledgeBaseName.trim()} className="gap-2"><Save className="w-4 h-4" /> Save</PopButton>
          </>
        }
      >
        {/* Knowledge Base Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Knowledge Base Name
          </label>
          <input
            type="text"
            value={knowledgeBaseName}
            onChange={(e) => setKnowledgeBaseName(e.target.value)}
            placeholder="Enter knowledge base name..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Website Scan */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={kbWebsiteUrl}
              onChange={(e) => setKbWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <PopButton
              color="blue"
              onClick={handleKbScanWebsite}
              disabled={kbScanning || !kbWebsiteUrl.trim()}
              className="gap-1.5 whitespace-nowrap"
            >
              {kbScanning ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Scan</>
              )}
            </PopButton>
          </div>
          <p className="text-xs text-gray-500 mt-1">AI reads your website and auto-fills services, FAQs, and policies</p>
        </div>

        {/* Services */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Services & Pricing</label>
            <button
              type="button"
              onClick={() => setKbServices(prev => [...prev, { name: '', duration: 30, price: 0 }])}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Service
            </button>
          </div>
          {kbServices.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No services added yet. Scan your website or add manually.</p>
          ) : (
            <div className="space-y-2">
              {kbServices.map((service, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={service.name}
                    onChange={(e) => { const s = [...kbServices]; s[i] = { ...s[i], name: e.target.value }; setKbServices(s); }}
                    placeholder="Service name"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={String(service.duration)}
                    onChange={(e) => { const s = [...kbServices]; s[i] = { ...s[i], duration: parseInt(e.target.value) || 0 }; setKbServices(s); }}
                    placeholder="Min"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="relative w-20">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      value={String(service.price)}
                      onChange={(e) => { const s = [...kbServices]; s[i] = { ...s[i], price: parseInt(e.target.value) || 0 }; setKbServices(s); }}
                      className="w-full pl-5 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button onClick={() => setKbServices(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAQs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">FAQs</label>
            <button
              type="button"
              onClick={() => setKbFaqs(prev => [...prev, { question: '', answer: '' }])}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add FAQ
            </button>
          </div>
          {kbFaqs.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No FAQs added yet. Scan your website or add manually.</p>
          ) : (
            <div className="space-y-2">
              {kbFaqs.map((faq, i) => (
                <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-1.5 relative">
                  <button onClick={() => setKbFaqs(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-0.5 text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <input
                    value={faq.question}
                    onChange={(e) => { const f = [...kbFaqs]; f[i] = { ...f[i], question: e.target.value }; setKbFaqs(f); }}
                    placeholder="Question"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) => { const f = [...kbFaqs]; f[i] = { ...f[i], answer: e.target.value }; setKbFaqs(f); }}
                    placeholder="Answer"
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Policies */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Policies</label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Cancellation</label>
              <textarea
                value={kbPolicies.cancellation}
                onChange={(e) => setKbPolicies(prev => ({ ...prev, cancellation: e.target.value }))}
                placeholder="24-hour notice required..."
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Reschedule</label>
              <textarea
                value={kbPolicies.reschedule}
                onChange={(e) => setKbPolicies(prev => ({ ...prev, reschedule: e.target.value }))}
                placeholder="Can reschedule up to 12 hours before..."
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Deposit / Payment</label>
              <textarea
                value={kbPolicies.deposit}
                onChange={(e) => setKbPolicies(prev => ({ ...prev, deposit: e.target.value }))}
                placeholder="$50 deposit required..."
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200 dark:border-gray-600" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-800 px-2 text-gray-400">Documents</span></div>
        </div>

        {/* Add Documents Button */}
        <div className="mb-6">
          <div className="relative" ref={kbDropdownRef}>
            <PopButton color="blue"
              onClick={handleAddKbDocument}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">Add Documents</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showKbDocumentDropdown ? 'rotate-180' : ''}`} />
            </PopButton>

            <AnimatePresence>
              {showKbDocumentDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                >
                  <div className="py-1">
                    <button
                      onClick={handleKbAddWebsite}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Websites</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Import from URL</div>
                      </div>
                    </button>
                    <button
                      onClick={handleKbAddFile}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Upload files</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, TXT</div>
                      </div>
                    </button>
                    <button
                      onClick={handleKbAddText}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Add text</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Create from scratch</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Documents List */}
        {kbDocuments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Documents ({kbDocuments.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {kbDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {doc.type === 'url' && <Globe className="w-4 h-4 text-green-600" />}
                    {doc.type === 'file' && <Upload className="w-4 h-4 text-blue-600" />}
                    {doc.type === 'text' && <PenTool className="w-4 h-4 text-purple-600" />}
                    <span className="text-sm text-gray-900 dark:text-white">{doc.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveKbDocument(doc.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalShell>

      {/* Popup Modal for Adding Documents */}
      <ModalShell
        open={!!showPopup}
        onClose={handleClosePopup}
        title={
          popupType === 'url' ? 'Import from URL' :
          popupType === 'file' ? 'Upload File' :
          popupType === 'blank' ? 'Create Blank Page' : ''
        }
        description={
          popupType === 'url' ? 'Enter the URL of the website you want to import content from.' :
          popupType === 'blank' ? 'Create a new knowledge base page that you can edit manually.' :
          undefined
        }
        footer={
          <>
            <PopButton onClick={handleClosePopup}>Cancel</PopButton>
            {popupType === 'url' && (
              <PopButton color="blue" onClick={handleSubmitUrl} disabled={!urlInput}>
                {showNewKnowledgeBaseModal ? 'Add' : 'Import'}
              </PopButton>
            )}
            {popupType === 'file' && (
              <PopButton color="blue" onClick={handleSubmitFile} disabled={!fileInput}>
                {showNewKnowledgeBaseModal ? 'Add' : 'Upload'}
              </PopButton>
            )}
            {popupType === 'blank' && (
              <PopButton color="blue" onClick={handleSubmitBlankPage} disabled={!blankPageTitle}>
                {showNewKnowledgeBaseModal ? 'Add' : 'Create'}
              </PopButton>
            )}
          </>
        }
      >
        {/* URL Content */}
        {popupType === 'url' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {!showNewKnowledgeBaseModal && folderPickerUI}
          </div>
        )}

        {/* File Content */}
        {popupType === 'file' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <FileUpload onChange={handleFileUpload} />
            {!showNewKnowledgeBaseModal && folderPickerUI}
          </div>
        )}

        {/* Blank Page Content */}
        {popupType === 'blank' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Title
            </label>
            <input
              type="text"
              value={blankPageTitle}
              onChange={(e) => setBlankPageTitle(e.target.value)}
              placeholder="Enter page title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {!showNewKnowledgeBaseModal && folderPickerUI}
          </div>
        )}
      </ModalShell>

      {/* Document Editor Modal */}
      <AnimatePresence>
        {showDocumentEditor && editingDocumentId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed -inset-[200px] bg-black/50 flex items-center justify-center z-[9999]"
            onClick={handleCancelEdit}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-8 max-w-4xl w-full mx-2 md:mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate mr-2">
                  Edit: {documents.find(d => d.id === editingDocumentId)?.name}
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <textarea
                value={editingDocumentContent}
                onChange={(e) => setEditingDocumentContent(e.target.value)}
                className="w-full h-64 md:h-96 p-3 md:p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-y mb-4 md:mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm md:text-base"
                placeholder="Start writing your document here..."
              />

              <div className="flex justify-end gap-3">
                <PopButton onClick={handleCancelEdit}>Cancel</PopButton>
                <PopButton color="blue" onClick={handleSaveDocument} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </PopButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fill the Gaps Quiz Modal */}
      <ModalShell
        open={showGapsQuiz}
        onClose={() => setShowGapsQuiz(false)}
        title="Fill the Gaps"
        description={`Answer a few quick questions about your ${businessIndustry || 'business'} to train your AI agent.`}
        maxWidth="max-w-lg"
        footer={
          (() => {
            const questions = getQuizQuestions();
            const isLast = quizStep >= questions.length - 1;
            const currentQ = questions[quizStep];
            const hasAnswer = currentQ && quizAnswers[currentQ.key]?.trim();

            return (
              <>
                {quizStep > 0 && (
                  <button
                    onClick={() => setQuizStep(s => s - 1)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    if (isLast) {
                      handleQuizSave();
                    } else {
                      setQuizStep(s => s + 1);
                    }
                  }}
                  disabled={!hasAnswer || quizSaving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {quizSaving ? (
                    <>Saving...</>
                  ) : isLast ? (
                    <>Save All</>
                  ) : (
                    <>Next <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </>
            );
          })()
        }
      >
        {(() => {
          const questions = getQuizQuestions();
          if (questions.length === 0) {
            return <p className="text-sm text-gray-500">All gaps are filled! Your KB is complete.</p>;
          }
          const q = questions[quizStep];
          if (!q) return null;

          return (
            <div className="space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-1.5">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < quizStep ? 'bg-blue-500' : i === quizStep ? 'bg-blue-400' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-400 font-medium">
                Question {quizStep + 1} of {questions.length}
              </p>

              <label className="block text-sm font-semibold text-gray-900">
                {q.question}
              </label>

              {q.multiline ? (
                <textarea
                  rows={6}
                  value={quizAnswers[q.key] || ''}
                  onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none text-gray-900"
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={quizAnswers[q.key] || ''}
                  onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  autoFocus
                />
              )}
            </div>
          );
        })()}
      </ModalShell>

      {/* Create / Rename Folder Modal */}
      <ModalShell
        open={showCreateFolderModal}
        onClose={() => { setShowCreateFolderModal(false); setNewFolderName(''); setRenamingFolderId(null); setRenamingFolderName(''); }}
        title={renamingFolderId ? 'Rename Folder' : 'Create New Folder'}
      >
        <div className="space-y-4 p-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
            <input
              type="text"
              value={renamingFolderId ? renamingFolderName : newFolderName}
              onChange={(e) => renamingFolderId ? setRenamingFolderName(e.target.value) : setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renamingFolderId) {
                    handleRenameFolder(renamingFolderId, renamingFolderName);
                    setShowCreateFolderModal(false);
                    setRenamingFolderId(null);
                    setRenamingFolderName('');
                  } else {
                    handleCreateFolder();
                  }
                }
              }}
              placeholder="e.g. Product Catalog, HR Policies..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowCreateFolderModal(false); setNewFolderName(''); setRenamingFolderId(null); setRenamingFolderName(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (renamingFolderId) {
                  handleRenameFolder(renamingFolderId, renamingFolderName);
                  setShowCreateFolderModal(false);
                  setRenamingFolderId(null);
                  setRenamingFolderName('');
                } else {
                  handleCreateFolder();
                }
              }}
              disabled={renamingFolderId ? !renamingFolderName.trim() : !newFolderName.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {renamingFolderId ? 'Save' : 'Create Folder'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default KnowledgeBasePage;
