import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLenis } from '../hooks/useLenis';
// AuthProvider is lazy — this keeps @supabase/supabase-js (127 KB) out of the
// critical-path modulepreload list on marketing pages.
const AuthProvider = React.lazy(() =>
  import('../contexts/AuthProvider').then(m => ({ default: m.AuthProvider }))
);
// DashboardProviders is lazy — keeps SubscriptionContext+TokenContext (and their
// transitive Supabase deps) out of the critical-path bundle on marketing pages.
const DashboardProviders = React.lazy(() => import('../components/DashboardProviders'));
import ProtectedRoute from '../components/ProtectedRoute';
// PlanGate is lazy — breaks the PlanGate→SubscriptionContext→stripe.ts→supabase
// static import chain so supabase never lands in the critical-path bundle.
const PlanGate = React.lazy(() => import('../components/PlanGate'));
import AeoGlobalIntro from '../components/seo/AeoGlobalIntro';
// ── Eager loads (critical path — homepage only) ─────────────────────────
import Home from '../pages/Home';
import GlassDemo from '../pages/GlassDemo';
import BlogSchemaWrapper from '../components/BlogSchemaWrapper';
// Setup is eagerly loaded — lazy+Suspense(fallback=null) caused blank screen on first visit
import Setup from '../pages/Setup';
import SetupLoading from '../pages/SetupLoading';
const TalkToAgentPage = React.lazy(() => import('../pages/setup/TalkToAgentPage'));
// Lazy — imports framer-motion; keeping it eager pulled that library into the
// initial bundle, inflating TBT by ~200 KiB of parse work on every page load.
const BlogNeverMissCallAfterHours = React.lazy(() => import('../pages/BlogNeverMissCallAfterHours'));
const BlogWhatsAppAppointmentBookingPlumbers = React.lazy(() => import('../pages/BlogWhatsAppAppointmentBookingPlumbers'));
const BlogAIReceptionistDentists = React.lazy(() => import('../pages/BlogAIReceptionistDentists'));
const BlogAIReceptionistLawFirms = React.lazy(() => import('../pages/BlogAIReceptionistLawFirms'));
// ── Auth pages — lazy-loaded (not on typical landing path) ──────────────
const Login = React.lazy(() => import('../pages/Login'));
const Signup = React.lazy(() => import('../pages/Signup'));
const AuthCallback = React.lazy(() => import('../pages/AuthCallback'));

// ── Lazy loads — Dashboard shell & pages ─────────────────────────────────
const DashboardLayout = React.lazy(() => import('../components/dashboard/DashboardLayout'));
const SettingsLayout = React.lazy(() => import('../components/dashboard/SettingsLayout'));
const DashboardPage = React.lazy(() => import('../pages/dashboard/DashboardPage'));
const AnalyticsPage = React.lazy(() => import('../pages/dashboard/AnalyticsPage'));
const DeepAnalyticsPage = React.lazy(() => import('../pages/dashboard/DeepAnalyticsPage'));
const AgentsPage = React.lazy(() => import('../pages/dashboard/AgentsPage'));
const AgentDetailPage = React.lazy(() => import('../pages/dashboard/AgentDetailPage'));
const ReceptionistPage = React.lazy(() => import('../pages/dashboard/ReceptionistPage'));
const SmsPage = React.lazy(() => import('../pages/dashboard/SmsPage'));
const WhatsappPage = React.lazy(() => import('../pages/dashboard/WhatsappPage'));
const EmailPage = React.lazy(() => import('../pages/dashboard/EmailPage'));
const SettingsPage = React.lazy(() => import('../pages/dashboard/SettingsPage'));
const KnowledgeBasePage = React.lazy(() => import('../pages/dashboard/KnowledgeBasePage'));
const PhoneNumbersPage = React.lazy(() => import('../pages/dashboard/PhoneNumbersPage'));
const IntegrationsPage = React.lazy(() => import('../pages/dashboard/IntegrationsPage'));
const InstantLeadReplyPage = React.lazy(() => import('../pages/dashboard/InstantLeadReplyPage'));
const WebsiteInstantResponsePage = React.lazy(() => import('../pages/dashboard/WebsiteInstantResponsePage'));
const AdInstantResponsePage = React.lazy(() => import('../pages/dashboard/AdInstantResponsePage'));
const VoiceLibraryPage = React.lazy(() => import('../pages/dashboard/VoiceLibraryPage'));
const WebsiteBubblePage = React.lazy(() => import('../pages/dashboard/WebsiteBubblePage'));
const RemindersPage = React.lazy(() => import('../pages/dashboard/RemindersPage'));
const CalcomPage = React.lazy(() => import('../pages/dashboard/CalcomPage'));
const CallHistoryPage = React.lazy(() => import('../pages/dashboard/CallHistoryPage'));
const ReputationPage = React.lazy(() => import('../pages/dashboard/ReputationPage'));
const LeadsPage = React.lazy(() => import('../pages/dashboard/LeadsPage'));
const MissedCallsPage = React.lazy(() => import('../pages/dashboard/MissedCallsPage'));
const MessagesPage = React.lazy(() => import('../pages/dashboard/MessagesPage'));
const LocationDashboardPage = React.lazy(() => import('../pages/dashboard/LocationDashboardPage'));
const GettingStartedPage = React.lazy(() => import('../pages/dashboard/GettingStartedPage'));
const FeedbackPage = React.lazy(() => import('../pages/dashboard/FeedbackPage'));
const BoltcallAgentPage = React.lazy(() => import('../pages/dashboard/BoltcallAgentPage'));

// ── Lazy loads — Dashboard settings ──────────────────────────────────────
const QARubricsPage = React.lazy(() => import('../pages/dashboard/QARubricsPage'));
const QAReviewPage = React.lazy(() => import('../pages/dashboard/QAReviewPage'));
const QAAnalyticsPage = React.lazy(() => import('../pages/dashboard/QAAnalyticsPage'));
const GeneralPage = React.lazy(() => import('../pages/dashboard/settings/GeneralPage'));
const PreferencesPage = React.lazy(() => import('../pages/dashboard/settings/PreferencesPage'));
const MembersPage = React.lazy(() => import('../pages/dashboard/settings/MembersPage'));
const PlanBillingPage = React.lazy(() => import('../pages/dashboard/settings/PlanBillingPage'));
const UsagePage = React.lazy(() => import('../pages/dashboard/settings/UsagePage'));
const NotificationPage = React.lazy(() => import('../pages/dashboard/settings/NotificationPage'));
const RolesPage = React.lazy(() => import('../pages/dashboard/settings/RolesPage'));
const ActivityLogPage = React.lazy(() => import('../pages/dashboard/settings/ActivityLogPage'));
const ApiKeysPage = React.lazy(() => import('../pages/dashboard/settings/ApiKeysPage'));
const WorkspacePage = React.lazy(() => import('../pages/dashboard/settings/WorkspacePage'));
const PackagesPage = React.lazy(() => import('../pages/dashboard/settings/PackagesPage'));

// ── Lazy loads — Static / info pages ─────────────────────────────────────
const HelpCenter = React.lazy(() => import('../pages/HelpCenter'));
const Privacy = React.lazy(() => import('../pages/Privacy'));
const Terms = React.lazy(() => import('../pages/Terms'));
const DPA = React.lazy(() => import('../pages/DPA'));
const Contact = React.lazy(() => import('../pages/Contact'));
const BookCall = React.lazy(() => import('../pages/BookCall'));
const About = React.lazy(() => import('../pages/About'));
const Newsletter = React.lazy(() => import('../pages/Newsletter'));
const PricingPage = React.lazy(() => import('../pages/PricingPage'));
const AiCoursePage = React.lazy(() => import('../pages/AiCoursePage'));
const Documentation = React.lazy(() => import('../pages/Documentation'));
const ApiDocsPage = React.lazy(() => import('../pages/ApiDocsPage'));
const NotFound = React.lazy(() => import('../pages/NotFound'));
const AdminPanel = React.lazy(() => import('../pages/AdminPanel'));

// ── Lazy loads — Payment / Giveaway ──────────────────────────────────────
// /payment/pro and /payment/elite-starter pages were removed when PayPal moved
// to the Subscriptions API; checkout now happens in the dashboard via
// PlanBillingPage → redirectToPayPalCheckout.
const Giveaway = React.lazy(() => import('../pages/Giveaway'));
const FreeWebsitePage = React.lazy(() => import('../pages/FreeWebsitePage'));

// ── Lazy loads — Lead magnets ────────────────────────────────────────────
// LeadMagnetPage is the reusable template used by the named children (e.g.
// LeadMagnetClaudeCodeOvernightKitPage), not mounted directly as a route.
const LeadMagnetHub = React.lazy(() => import('../pages/LeadMagnetHub'));
const LeadMagnetThankYouPage = React.lazy(() => import('../pages/LeadMagnetThankYouPage'));
const LeadMagnetClaudeCodeOvernightKitPage = React.lazy(() => import('../pages/LeadMagnetClaudeCodeOvernightKitPage'));
const LeadMagnetAIReceptionistBuyersGuide = React.lazy(() => import('../pages/LeadMagnetAIReceptionistBuyersGuide'));
const LeadMagnetSpeedToLeadStackPage = React.lazy(() => import('../pages/LeadMagnetSpeedToLeadStackPage'));
const AIRevenueAudit = React.lazy(() => import('../pages/AIRevenueAudit'));
const AIRevenueResults = React.lazy(() => import('../pages/AIRevenueResults'));
const LeadResponseScorecard = React.lazy(() => import('../pages/LeadResponseScorecard'));
const LeadResponseScorecardResults = React.lazy(() => import('../pages/LeadResponseScorecardResults'));
const SEOAnalyzer = React.lazy(() => import('../pages/SEOAnalyzer'));
const ConversionRateOptimizer = React.lazy(() => import('../pages/ConversionRateOptimizer'));
const AIVisibilityCheck = React.lazy(() => import('../pages/AIVisibilityCheck'));
const AIAuditPage = React.lazy(() => import('../pages/AIAuditPage'));
const AIAuditThankYouPage = React.lazy(() => import('../pages/AIAuditThankYouPage'));
const SEOAuditPDF = React.lazy(() => import('../pages/SEOAuditPDF'));
const SEOAuditPDFThankYou = React.lazy(() => import('../pages/SEOAuditPDFThankYou'));
const BusinessAuditPage = React.lazy(() => import('../pages/BusinessAuditPage'));
const RankOnGoogleOfferPage = React.lazy(() => import('../pages/RankOnGoogleOfferPage'));
const NicheToolPage = React.lazy(() => import('../pages/NicheToolPage'));
const FunnelOptimizer = React.lazy(() => import('../pages/FunnelOptimizer'));
const FunnelOptimiser = React.lazy(() => import('../pages/FunnelOptimiser'));
const SolarIndustryHub = React.lazy(() => import('../pages/SolarIndustryHub'));
const SolarSpeedToLeadPlaybook = React.lazy(() => import('../pages/SolarSpeedToLeadPlaybook'));
const SolarSpeedToLeadPlaybookThankYou = React.lazy(() => import('../pages/SolarSpeedToLeadPlaybookThankYou'));
const SolarBenchmarkPage = React.lazy(() => import('../pages/SolarBenchmarkPage'));
const VoiceAgentOnboarding = React.lazy(() => import('../pages/VoiceAgentOnboarding'));
const AiReadinessScorecard = React.lazy(() => import('../pages/AiReadinessScorecard'));
const AiReceptionistRoi = React.lazy(() => import('../pages/AiReceptionistRoi'));
const FiveMinuteResponsePlaybook = React.lazy(() => import('../pages/FiveMinuteResponsePlaybook'));
const VetClinicRevenueCalculator = React.lazy(() => import('../pages/VetClinicRevenueCalculator'));
const ChiropractorPatientRecoveryCalculator = React.lazy(() => import('../pages/ChiropractorPatientRecoveryCalculator'));
const DentistChairCalculator = React.lazy(() => import('../pages/DentistChairCalculator'));
const HVACOverflowCalculator = React.lazy(() => import('../pages/HVACOverflowCalculator'));
const AutoRepairMissedCallCalculator = React.lazy(() => import('../pages/AutoRepairMissedCallCalculator'));
const RoofingMissedLeadCalculator = React.lazy(() => import('../pages/RoofingMissedLeadCalculator'));
const LawyerIntakeCalculator = React.lazy(() => import('../pages/LawyerIntakeCalculator'));
const MedSpaRebookingCalculator = React.lazy(() => import('../pages/MedSpaRebookingCalculator'));
const PlumberRevenueCalculator = React.lazy(() => import('../pages/PlumberRevenueCalculator'));
const RealEstateSpeedScorecard = React.lazy(() => import('../pages/RealEstateSpeedScorecard'));
const InsuranceLeadResponseScorecard = React.lazy(() => import('../pages/InsuranceLeadResponseScorecard'));
const CleaningServiceBookingCalculator = React.lazy(() => import('../pages/CleaningServiceBookingCalculator'));
const LandscapingSeasonalRevenueCalculator = React.lazy(() => import('../pages/LandscapingSeasonalRevenueCalculator'));
const SolarProfitCalculator = React.lazy(() => import('../pages/SolarProfitCalculator'));
const SolarQuoteGenerator = React.lazy(() => import('../pages/SolarQuoteGenerator'));
const SolarSalesCloser = React.lazy(() => import('../pages/SolarSalesCloser'));
const SolarROICalculator = React.lazy(() => import('../pages/SolarROICalculator'));
const SolarSpeedScoreQuiz = React.lazy(() => import('../pages/SolarSpeedScoreQuiz'));
const SolarBenchmark2026 = React.lazy(() => import('../pages/SolarBenchmark2026'));
const HowToAIPhoneAnsweringVetClinic = React.lazy(() => import('../pages/HowToAIPhoneAnsweringVetClinic'));
const FAQAIReceptionistHVAC = React.lazy(() => import('../pages/FAQAIReceptionistHVAC'));
const FAQAIReceptionistDentist = React.lazy(() => import('../pages/FAQAIReceptionistDentist'));
const FAQAIReceptionistPlumber = React.lazy(() => import('../pages/FAQAIReceptionistPlumber'));
const FAQAIReceptionistLawyer = React.lazy(() => import('../pages/FAQAIReceptionistLawyer'));
const FAQAIReceptionistMedSpa = React.lazy(() => import('../pages/FAQAIReceptionistMedSpa'));
const FAQAIReceptionistSolar = React.lazy(() => import('../pages/FAQAIReceptionistSolar'));
const FAQAIReceptionistVet = React.lazy(() => import('../pages/FAQAIReceptionistVet'));

// ── Lazy loads — Speed Test funnel ───────────────────────────────────────
const SpeedTestLanding = React.lazy(() => import('../pages/speed-test/SpeedTestLanding'));
const SpeedTestLogin = React.lazy(() => import('../pages/speed-test/SpeedTestLogin'));
const SpeedTestReport = React.lazy(() => import('../pages/speed-test/SpeedTestReport'));
const SpeedTestOffer = React.lazy(() => import('../pages/speed-test/SpeedTestOffer'));

// ── Lazy loads — Blog pages ──────────────────────────────────────────────
const BlogCenter = React.lazy(() => import('../pages/BlogCenter'));
const Blog = React.lazy(() => import('../pages/Blog'));
const BlogSpeed = React.lazy(() => import('../pages/BlogSpeed'));
const BlogSEO = React.lazy(() => import('../pages/BlogSEO'));
const BlogAIGuide = React.lazy(() => import('../pages/BlogAIGuide'));
const BlogAIGuideStep1 = React.lazy(() => import('../pages/BlogAIGuideStep1'));
const BlogAIGuideStep2 = React.lazy(() => import('../pages/BlogAIGuideStep2'));
const BlogAIGuideStep3 = React.lazy(() => import('../pages/BlogAIGuideStep3'));
const BlogAIReceptionistComparison = React.lazy(() => import('../pages/BlogAIReceptionistComparison'));
const BlogAIReceptionistHowItWorks = React.lazy(() => import('../pages/BlogAIReceptionistHowItWorks'));
const BlogAIAnsweringServiceSmallBusiness = React.lazy(() => import('../pages/BlogAIAnsweringServiceSmallBusiness'));
const BlogIsAIReceptionistWorthIt = React.lazy(() => import('../pages/BlogIsAIReceptionistWorthIt'));
const BlogHowToMakeAIReceptionist = React.lazy(() => import('../pages/BlogHowToMakeAIReceptionist'));
const BlogWhatDoesInstantLeadReplyMean = React.lazy(() => import('../pages/BlogWhatDoesInstantLeadReplyMean'));
const BlogHVACAILeadResponse = React.lazy(() => import('../pages/BlogHVACAILeadResponse'));
const BlogDentalAILeadResponse = React.lazy(() => import('../pages/BlogDentalAILeadResponse'));
const BlogAIReceptionistRealEstate = React.lazy(() => import('../pages/BlogAIReceptionistRealEstate'));
const BlogAIAppointmentSchedulingHVAC = React.lazy(() => import('../pages/BlogAIAppointmentSchedulingHVAC'));
const BlogHowToSetUpInstantLeadReply = React.lazy(() => import('../pages/BlogHowToSetUpInstantLeadReply'));
const BlogHowDoesInstantLeadReplyWork = React.lazy(() => import('../pages/BlogHowDoesInstantLeadReplyWork'));
const BlogHowToScheduleText = React.lazy(() => import('../pages/BlogHowToScheduleText'));
const BlogAutomaticGoogleReviews = React.lazy(() => import('../pages/BlogAutomaticGoogleReviews'));
const BlogOutsourcedReceptionServices = React.lazy(() => import('../pages/BlogOutsourcedReceptionServices'));
const BlogEffectivePhoneCallScripts = React.lazy(() => import('../pages/BlogEffectivePhoneCallScripts'));
const BlogLiveAnsweringServiceCosts = React.lazy(() => import('../pages/BlogLiveAnsweringServiceCosts'));
const BlogProfessionalTelephoneEtiquette = React.lazy(() => import('../pages/BlogProfessionalTelephoneEtiquette'));
const BlogAnsweringServiceAppointmentScheduling = React.lazy(() => import('../pages/BlogAnsweringServiceAppointmentScheduling'));
const BlogTop10AIReceptionistAgencies = React.lazy(() => import('../pages/BlogTop10AIReceptionistAgencies'));
const BlogGeminiGemBusinessAssistant = React.lazy(() => import('../pages/BlogGeminiGemBusinessAssistant'));
const Blog5SignsAIReceptionist = React.lazy(() => import('../pages/Blog5SignsAIReceptionist'));
const BestAfterHoursAnsweringService = React.lazy(() => import('../pages/BestAfterHoursAnsweringService'));
const AiPhoneAnsweringDentists = React.lazy(() => import('../pages/AiPhoneAnsweringDentists'));
const AiPhoneAnsweringPlumbers = React.lazy(() => import('../pages/AiPhoneAnsweringPlumbers'));
const WhatIsAIReceptionistGuide = React.lazy(() => import('../pages/WhatIsAIReceptionistGuide'));
const BestAiReceptionistSmallBusiness = React.lazy(() => import('../pages/BestAiReceptionistSmallBusiness'));
const ChatbotVsLiveChatVsPhoneAnswering = React.lazy(() => import('../pages/ChatbotVsLiveChatVsPhoneAnswering'));
const AIVsHumanReceptionistBlog = React.lazy(() => import('../pages/AIVsHumanReceptionistBlog'));
const AiReceptionistCostPricingGuide = React.lazy(() => import('../pages/AiReceptionistCostPricingGuide'));
const SpeedToLeadGuide = React.lazy(() => import('../pages/SpeedToLeadGuide'));
const SpeedToLeadPillar = React.lazy(() => import('../pages/SpeedToLeadPillar'));
const SpeedToLeadStatistics = React.lazy(() => import('../pages/SpeedToLeadStatistics'));
const ChatbotVsLivePhoneComparison = React.lazy(() => import('../pages/ChatbotVsLivePhoneComparison'));
const AiReceptionistForPlumbers = React.lazy(() => import('../pages/AiReceptionistForPlumbers'));
const AIReceptionistWorthItROI = React.lazy(() => import('../pages/AIReceptionistWorthItROI'));
const MissedCallsStatistics2026 = React.lazy(() => import('../pages/MissedCallsStatistics2026'));
const BestAIReceptionistHomeServices = React.lazy(() => import('../pages/BestAIReceptionistHomeServices'));
const AiAgentSmallBusiness247CallAnswering = React.lazy(() => import('../pages/AiAgentSmallBusiness247CallAnswering'));
const RoofingMissedCallsLeadCapture = React.lazy(() => import('../pages/RoofingMissedCallsLeadCapture'));
const HomeServiceGoogleAdsLeadFollowUp = React.lazy(() => import('../pages/HomeServiceGoogleAdsLeadFollowUp'));
const BestAIAnsweringServiceDentalMedical = React.lazy(() => import('../pages/BestAIAnsweringServiceDentalMedical'));
const BlogAfterHoursLeadResponse = React.lazy(() => import('../pages/BlogAfterHoursLeadResponse'));
const BlogAIReceptionistMedSpa = React.lazy(() => import('../pages/BlogAIReceptionistMedSpa'));
const BlogSolarAILeadResponse = React.lazy(() => import('../pages/BlogSolarAILeadResponse'));

// ── Lazy loads — Comparisons ─────────────────────────────────────────────
const Comparisons = React.lazy(() => import('../pages/Comparisons'));
const TraditionalCallCentersVsBoltcall = React.lazy(() => import('../pages/comparisons/TraditionalCallCentersVsBoltcall'));
const ReceptionistVsBoltcall = React.lazy(() => import('../pages/comparisons/ReceptionistVsBoltcall'));
const VoicemailVsBoltcall = React.lazy(() => import('../pages/comparisons/VoicemailVsBoltcall'));
const AnsweringServicesVsBoltcall = React.lazy(() => import('../pages/comparisons/AnsweringServicesVsBoltcall'));
const CRMInstantLeadReplyVsBoltcall = React.lazy(() => import('../pages/comparisons/CRMInstantLeadReplyVsBoltcall'));

// ── Lazy loads — Competitor comparison pages ─────────────────────────────
const CompareBoltcallVsPodium = React.lazy(() => import('../pages/CompareBoltcallVsPodium'));
const CompareBoltcallVsGoHighLevel = React.lazy(() => import('../pages/CompareBoltcallVsGoHighLevel'));
const CompareBoltcallVsBirdeye = React.lazy(() => import('../pages/CompareBoltcallVsBirdeye'));
const CompareBoltcallVsEmitrr = React.lazy(() => import('../pages/CompareBoltcallVsEmitrr'));
const CompareBoltcallVsCalomation = React.lazy(() => import('../pages/CompareBoltcallVsCalomation'));
const CompareBoltcallVsSmithAi = React.lazy(() => import('../pages/CompareBoltcallVsSmithAi'));
const PodiumAlternatives = React.lazy(() => import('../pages/PodiumAlternatives'));

// ── Lazy loads — Feature pages ───────────────────────────────────────────
const AIReceptionistPage = React.lazy(() => import('../pages/features/AIReceptionistPage'));
const InstantFormReplyPage = React.lazy(() => import('../pages/features/InstantFormReplyPage'));
const SMSBookingAssistantPage = React.lazy(() => import('../pages/features/SMSBookingAssistantPage'));
const AutomatedRemindersPage = React.lazy(() => import('../pages/features/AutomatedRemindersPage'));
const AIFollowUpSystemPage = React.lazy(() => import('../pages/features/AIFollowUpSystemPage'));
const WebsiteChatVoiceWidgetPage = React.lazy(() => import('../pages/features/WebsiteChatVoiceWidgetPage'));
const LeadReactivationFeaturePage = React.lazy(() => import('../pages/features/LeadReactivationPage'));
const SmartWebsitePage = React.lazy(() => import('../pages/features/SmartWebsitePage'));

// ── Lazy loads — Partners ────────────────────────────────────────────────
const Partners = React.lazy(() => import('../pages/Partners'));

// ── Lazy loads — Demo / misc pages ───────────────────────────────────────
const Strike = React.lazy(() => import('../pages/Strike'));
const Challenge = React.lazy(() => import('../pages/Challenge'));
const ChallengeCall = React.lazy(() => import('../pages/ChallengeCall'));
const ChallengeWinner = React.lazy(() => import('../pages/ChallengeWinner'));
const ButtonDemoPage = React.lazy(() => import('../pages/ButtonDemoPage'));
const DemoFlowPage = React.lazy(() => import('../pages/DemoFlowPage'));
const DrHazakLandingPage = React.lazy(() => import('../pages/DrHazakLandingPage'));
const AgentArchitecturePage = React.lazy(() => import('../pages/AgentArchitecturePage'));
const LogoAnimationDemoPage = React.lazy(() => import('../pages/LogoAnimationDemoPage'));
const RockerSwitchDemoPage = React.lazy(() => import('../pages/RockerSwitchDemoPage'));
const ReceptionistDemo = React.lazy(() => import('../pages/ReceptionistDemo'));

const NavigationWrapper: React.FC = () => {
  const location = useLocation();
  const { i18n } = useTranslation();

  // RTL support for Hebrew — only apply to dashboard, public pages stay English LTR
  useEffect(() => {
    const isDashboard = location.pathname.startsWith('/dashboard');
    if (isDashboard) {
      const lang = i18n.language?.split('-')[0] || 'en'; // normalize he-IL → he
      document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  }, [i18n.language, location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    // Scroll window to top
    window.scrollTo(0, 0);

    // Also handle Lenis smooth scroll if it exists
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true });
    }
  }, [location.pathname]);

  // Initialize Lenis smooth scrolling
  useLenis();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/glass-demo" element={<GlassDemo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard/getting-started" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardProviders>
                <DashboardLayout />
              </DashboardProviders>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="getting-started" element={<GettingStartedPage />} />
          <Route path="boltcall-agent" element={<BoltcallAgentPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="boltcall-agent" element={<BoltcallAgentPage />} />
          <Route path="locations/:locationId" element={<LocationDashboardPage />} />

          {/* Pro-gated merged pages */}
          <Route path="leads" element={<PlanGate requiredPlan="pro"><LeadsPage /></PlanGate>} />
          <Route path="calls" element={<PlanGate requiredPlan="starter"><CallHistoryPage /></PlanGate>} />
          <Route path="messages" element={<PlanGate requiredPlan="pro"><MessagesPage /></PlanGate>} />

          {/* Starter-gated pages */}
          <Route path="qa/rubrics"   element={<PlanGate requiredPlan="starter"><QARubricsPage /></PlanGate>} />
          <Route path="qa/review"    element={<PlanGate requiredPlan="starter"><QAReviewPage /></PlanGate>} />
          <Route path="qa/analytics" element={<PlanGate requiredPlan="starter"><QAAnalyticsPage /></PlanGate>} />
          <Route path="ai-receptionist" element={<PlanGate requiredPlan="starter"><ReceptionistPage /></PlanGate>} />
          <Route path="agents" element={<PlanGate requiredPlan="starter"><AgentsPage /></PlanGate>} />
          <Route path="agents/:agentId" element={<PlanGate requiredPlan="starter"><AgentDetailPage /></PlanGate>} />
          <Route path="agent-tests" element={<Navigate to="/dashboard/agents" replace />} />
          <Route path="voice-library" element={<PlanGate requiredPlan="starter"><VoiceLibraryPage /></PlanGate>} />
          <Route path="knowledge-base" element={<PlanGate requiredPlan="starter"><KnowledgeBasePage /></PlanGate>} />
          <Route path="phone" element={<PlanGate requiredPlan="starter"><PhoneNumbersPage /></PlanGate>} />
          <Route path="phone-numbers" element={<Navigate to="/dashboard/phone" replace />} />
          <Route path="chat-widget" element={<PlanGate requiredPlan="starter"><WebsiteBubblePage /></PlanGate>} />

          {/* Free pages */}
          <Route path="integrations" element={<IntegrationsPage />} />

          {/* Pro-gated pages */}
          <Route path="analytics" element={<PlanGate requiredPlan="pro"><AnalyticsPage /></PlanGate>} />
          <Route path="deep-analytics" element={<PlanGate requiredPlan="pro"><DeepAnalyticsPage /></PlanGate>} />
          <Route path="reminders" element={<PlanGate requiredPlan="pro"><RemindersPage /></PlanGate>} />
          <Route path="reputation" element={<PlanGate requiredPlan="pro"><ReputationPage /></PlanGate>} />
          <Route path="instant-lead-response" element={<PlanGate requiredPlan="pro"><InstantLeadReplyPage /></PlanGate>} />
          <Route path="website-instant-response" element={<PlanGate requiredPlan="pro"><WebsiteInstantResponsePage /></PlanGate>} />
          <Route path="ad-instant-response" element={<PlanGate requiredPlan="pro"><AdInstantResponsePage /></PlanGate>} />
          <Route path="calcom" element={<PlanGate requiredPlan="pro"><CalcomPage /></PlanGate>} />
          <Route path="sms" element={<PlanGate requiredPlan="pro"><SmsPage /></PlanGate>} />
          <Route path="whatsapp" element={<PlanGate requiredPlan="pro"><WhatsappPage /></PlanGate>} />
          <Route path="email" element={<PlanGate requiredPlan="pro"><EmailPage /></PlanGate>} />

          {/* Redirects from old paths to new merged pages */}
          <Route path="speed-to-lead" element={<Navigate to="/dashboard/leads" replace />} />
          <Route path="missed-calls" element={<PlanGate requiredPlan="pro"><MissedCallsPage /></PlanGate>} />
          <Route path="lead-reactivation" element={<Navigate to="/dashboard/leads" replace />} />
          <Route path="call-history" element={<Navigate to="/dashboard/calls" replace />} />
          <Route path="assistant" element={<Navigate to="/dashboard/calls" replace />} />
          <Route path="chat-history" element={<Navigate to="/dashboard/messages" replace />} />
          <Route path="sms-booking" element={<Navigate to="/dashboard/messages" replace />} />
          <Route path="follow-ups" element={<Navigate to="/dashboard/messages" replace />} />
          <Route path="website-bubble" element={<Navigate to="/dashboard/chat-widget" replace />} />
          <Route path="instant-lead-reply" element={<Navigate to="/dashboard/leads" replace />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<SettingsPage />} />
            <Route path="general" element={<GeneralPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="plan-billing" element={<PlanBillingPage />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="notifications" element={<NotificationPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="activity-log" element={<ActivityLogPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="packages" element={<PackagesPage />} />
            {/* Redirects for removed settings pages */}
            <Route path="billing" element={<Navigate to="/dashboard/settings/plan-billing" replace />} />
            <Route path="notification-preferences" element={<Navigate to="/dashboard/settings/notifications" replace />} />
            <Route path="services" element={<Navigate to="/dashboard/settings/general" replace />} />
          </Route>
        </Route>
        {/* /setup is intentionally PUBLIC — wizard collects data pre-signup; auth happens in the final step */}
        <Route path="/setup" element={<Setup />} />
        <Route path="/setup/loading" element={<ProtectedRoute><DashboardProviders><SetupLoading /></DashboardProviders></ProtectedRoute>} />
        <Route path="/setup/talk-to-agent" element={<ProtectedRoute><DashboardProviders><TalkToAgentPage /></DashboardProviders></ProtectedRoute>} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book-a-call" element={<BookCall />} />
        <Route path="/about" element={<About />} />
        <Route path="/partners" element={<Partners />} />

        {/* Speed Test Funnel */}
        <Route path="/speed-test" element={<SpeedTestLanding />} />
        <Route path="/speed-test/login" element={<SpeedTestLogin />} />
        <Route path="/speed-test/report" element={<SpeedTestReport />} />
        <Route path="/speed-test/offer" element={<SpeedTestOffer />} />
        {/* Old hosted-button payment pages removed; checkout lives in the dashboard now. */}
        <Route path="/payment/pro" element={<Navigate to="/dashboard/settings/plan-billing" replace />} />
        <Route path="/payment/elite-starter" element={<Navigate to="/dashboard/settings/plan-billing" replace />} />
        <Route path="/giveaway" element={<Giveaway />} />
        <Route path="/lead-magnet" element={<LeadMagnetHub />} />
        <Route path="/lead-magnet/thank-you" element={<LeadMagnetThankYouPage />} />
        <Route path="/lead-magnet/claude-code-overnight-kit" element={<LeadMagnetClaudeCodeOvernightKitPage />} />
        <Route path="/lead-magnet/ai-receptionist-buyers-guide" element={<LeadMagnetAIReceptionistBuyersGuide />} />
        <Route path="/lead-magnet/speed-to-lead-stack" element={<LeadMagnetSpeedToLeadStackPage />} />
        <Route path="/free-website" element={<FreeWebsitePage />} />
        <Route path="/free-website-package" element={<Navigate to="/free-website" replace />} />
        <Route path="/free-website-package/pricing" element={<Navigate to="/pricing" replace />} />
        {/* /gift-cards removed — not needed pre-revenue */}
        {/* /smart-website removed — duplicate of free-website concept */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/ai-course" element={<AiCoursePage />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/api-documentation" element={<ApiDocsPage />} />
        <Route element={<BlogSchemaWrapper />}>
        <Route path="/blog" element={<BlogCenter />} />
        <Route path="/newsletter" element={<Newsletter />} />
        <Route path="/blog/the-new-reality-for-local-businesses" element={<Blog />} />
        <Route path="/blog/why-speed-matters" element={<BlogSpeed />} />
        <Route path="/blog/complete-guide-to-seo" element={<BlogSEO />} />
        <Route path="/ai-guide-for-businesses" element={<BlogAIGuide />} />
        <Route path="/ai-guide-for-businesses/level-1-understanding-ai" element={<BlogAIGuideStep1 />} />
        <Route path="/ai-guide-for-businesses/level-2-choosing-ai-tools" element={<BlogAIGuideStep2 />} />
        <Route path="/ai-guide-for-businesses/level-3-getting-started" element={<BlogAIGuideStep3 />} />
        <Route path="/blog/best-ai-receptionist-tools" element={<BlogAIReceptionistComparison />} />
        <Route path="/blog/how-ai-receptionist-works" element={<BlogAIReceptionistHowItWorks />} />
        <Route path="/blog/ai-answering-service-small-business" element={<BlogAIAnsweringServiceSmallBusiness />} />
        <Route path="/blog/is-ai-receptionist-worth-it" element={<BlogIsAIReceptionistWorthIt />} />
        <Route path="/blog/how-to-make-ai-receptionist" element={<BlogHowToMakeAIReceptionist />} />
        <Route path="/blog/instant-lead-reply-guide" element={<BlogWhatDoesInstantLeadReplyMean />} />
        <Route path="/blog/hvac-ai-lead-response" element={<BlogHVACAILeadResponse />} />
        <Route path="/blog/dental-ai-lead-response" element={<BlogDentalAILeadResponse />} />
        <Route path="/blog/ai-receptionist-real-estate-agents" element={<BlogAIReceptionistRealEstate />} />
        <Route path="/blog/ai-appointment-scheduling-hvac" element={<BlogAIAppointmentSchedulingHVAC />} />
        <Route path="/blog/setup-instant-lead-reply" element={<BlogHowToSetUpInstantLeadReply />} />
        <Route path="/blog/how-instant-lead-reply-works" element={<BlogHowDoesInstantLeadReplyWork />} />
        <Route path="/blog/how-to-schedule-text" element={<BlogHowToScheduleText />} />
        <Route path="/blog/automatic-google-reviews" element={<BlogAutomaticGoogleReviews />} />
        <Route path="/blog/benefits-of-outsourced-reception-services" element={<BlogOutsourcedReceptionServices />} />
        <Route path="/blog/phone-call-scripts" element={<BlogEffectivePhoneCallScripts />} />
        <Route path="/blog/understanding-live-answering-service-costs" element={<BlogLiveAnsweringServiceCosts />} />
        <Route path="/blog/tips-for-professional-telephone-etiquette" element={<BlogProfessionalTelephoneEtiquette />} />
        <Route path="/blog/answering-service-scheduling" element={<BlogAnsweringServiceAppointmentScheduling />} />
        <Route path="/blog/top-10-ai-receptionist-agencies" element={<BlogTop10AIReceptionistAgencies />} />
        <Route path="/blog/create-gemini-gem-business-assistant" element={<BlogGeminiGemBusinessAssistant />} />
        <Route path="/blog/5-signs-you-need-ai-receptionist" element={<Blog5SignsAIReceptionist />} />
            <Route path="/speed-to-lead" element={<SpeedToLeadPillar />} />
            <Route path="/speed-to-lead/statistics" element={<SpeedToLeadStatistics />} />
            <Route path="/blog/speed-to-lead-local-business" element={<SpeedToLeadGuide />} />
            <Route path="/blog/ai-receptionist-cost-pricing" element={<AiReceptionistCostPricingGuide />} />
            <Route path="/blog/ai-vs-human-receptionist" element={<AIVsHumanReceptionistBlog />} />
            <Route path="/blog/ai-chatbot-vs-live-chat-phone-answering" element={<ChatbotVsLiveChatVsPhoneAnswering />} />
            <Route path="/blog/best-ai-receptionist-small-business" element={<BestAiReceptionistSmallBusiness />} />
            <Route path="/blog/ai-phone-answering-plumbers" element={<AiPhoneAnsweringPlumbers />} />
            {/* <Route path="/blog/is-ai-receptionist-worth-it" element={<IsAiReceptionistWorthIt />} /> */}
            {/* <Route path="/blog/google-reviews-automation-local-business" element={<GoogleReviewsAutomationGuide />} /> */}
            <Route path="/blog/what-is-ai-receptionist-guide" element={<WhatIsAIReceptionistGuide />} />
            <Route path="/blog/ai-phone-answering-dentists" element={<AiPhoneAnsweringDentists />} />
            <Route path="/blog/best-after-hours-answering-service" element={<BestAfterHoursAnsweringService />} />
            <Route path="/blog/ai-chatbot-vs-live-chat-phone-comparison" element={<ChatbotVsLivePhoneComparison />} />
            <Route path="/blog/ai-receptionist-for-plumbers" element={<AiReceptionistForPlumbers />} />
            <Route path="/blog/ai-receptionist-worth-it-roi" element={<AIReceptionistWorthItROI />} />
            <Route path="/blog/missed-calls-statistics-local-business-2026" element={<MissedCallsStatistics2026 />} />
        <Route path="/blog/best-ai-receptionist-home-services" element={<BestAIReceptionistHomeServices />} />
        <Route path="/blog/ai-agent-for-small-business-24-7-call-answering" element={<AiAgentSmallBusiness247CallAnswering />} />
        <Route path="/blog/roofing-company-stop-losing-leads-missed-calls" element={<RoofingMissedCallsLeadCapture />} />
        <Route path="/blog/home-service-google-ads-lead-follow-up" element={<HomeServiceGoogleAdsLeadFollowUp />} />
        <Route path="/blog/best-ai-answering-service-dental-medical-practice" element={<BestAIAnsweringServiceDentalMedical />} />
        <Route path="/blog/after-hours-lead-response-home-services" element={<BlogAfterHoursLeadResponse />} />
        <Route path="/blog/ai-receptionist-med-spas" element={<BlogAIReceptionistMedSpa />} />
        <Route path="/blog/solar-ai-lead-response" element={<BlogSolarAILeadResponse />} />
        </Route>
        <Route path="/comparisons" element={<Comparisons />} />
        <Route path="/comparisons/call-centers-vs-boltcall" element={<TraditionalCallCentersVsBoltcall />} />
        <Route path="/comparisons/receptionist-vs-boltcall" element={<ReceptionistVsBoltcall />} />
        <Route path="/comparisons/voicemail-vs-boltcall" element={<VoicemailVsBoltcall />} />
        <Route path="/comparisons/answering-services-vs-boltcall" element={<AnsweringServicesVsBoltcall />} />
        <Route path="/comparisons/crm-vs-boltcall" element={<CRMInstantLeadReplyVsBoltcall />} />
        <Route path="/compare/boltcall-vs-podium" element={<CompareBoltcallVsPodium />} />
        <Route path="/compare/boltcall-vs-gohighlevel" element={<CompareBoltcallVsGoHighLevel />} />
        <Route path="/compare/boltcall-vs-birdeye" element={<CompareBoltcallVsBirdeye />} />
        <Route path="/compare/boltcall-vs-emitrr" element={<CompareBoltcallVsEmitrr />} />
        <Route path="/compare/boltcall-vs-calomation" element={<CompareBoltcallVsCalomation />} />
        <Route path="/compare/boltcall-vs-smith-ai" element={<CompareBoltcallVsSmithAi />} />
        <Route path="/compare/podium-alternatives" element={<PodiumAlternatives />} />
        <Route path="/ai-agent-comparison" element={<TraditionalCallCentersVsBoltcall />} />
        <Route path="/ai-revenue-audit" element={<AIRevenueAudit />} />
        <Route path="/ai-revenue-calculator" element={<Navigate to="/ai-revenue-audit" replace />} />
        <Route path="/ai-revenue-calculator/results" element={<AIRevenueResults />} />
        <Route path="/lead-response-scorecard" element={<LeadResponseScorecard />} />
        <Route path="/lead-response-scorecard/results" element={<LeadResponseScorecardResults />} />
        <Route path="/seo-audit" element={<SEOAnalyzer />} />
        <Route path="/business-audit" element={<BusinessAuditPage />} />
        <Route path="/ai-audit" element={<AIAuditPage />} />
        <Route path="/ai-audit/thank-you" element={<AIAuditThankYouPage />} />
        <Route path="/seo-aeo-audit" element={<SEOAuditPDF />} />
        <Route path="/seo-aeo-audit/thank-you" element={<SEOAuditPDFThankYou />} />
        <Route path="/conversion-rate-optimizer" element={<ConversionRateOptimizer />} />
        <Route path="/ai-visibility-check" element={<AIVisibilityCheck />} />
        {/* Feature Pages */}
        <Route path="/features/ai-receptionist" element={<AIReceptionistPage />} />
        <Route path="/features/instant-form-reply" element={<InstantFormReplyPage />} />
        <Route path="/features/sms-booking-assistant" element={<SMSBookingAssistantPage />} />
        <Route path="/features/automated-reminders" element={<AutomatedRemindersPage />} />
        <Route path="/features/ai-follow-up-system" element={<AIFollowUpSystemPage />} />
        <Route path="/features/website-widget" element={<WebsiteChatVoiceWidgetPage />} />
        <Route path="/features/lead-reactivation" element={<LeadReactivationFeaturePage />} />
        <Route path="/features/smart-website" element={<SmartWebsitePage />} />
        {/* Demo / Challenge Pages */}
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/challenge/call" element={<ChallengeCall />} />
        <Route path="/challenge/winner" element={<ChallengeWinner />} />
        <Route path="/receptionist-demo" element={<ReceptionistDemo />} />
        <Route path="/button-demo" element={<ButtonDemoPage />} />
        <Route path="/logo-demo" element={<LogoAnimationDemoPage />} />
        <Route path="/rocker-switch-demo" element={<RockerSwitchDemoPage />} />
        <Route path="/demo" element={<DemoFlowPage />} />
        <Route path="/agent-architecture" element={<AgentArchitecturePage />} />
        <Route path="/funnel-optimizer" element={<FunnelOptimizer />} />
        <Route path="/funnel-optimiser" element={<FunnelOptimiser />} />
        <Route path="/strike-ai" element={<Strike />} />
        <Route path="/drhazak" element={<DrHazakLandingPage />} />
        <Route path="/rank-on-google-offer" element={<RankOnGoogleOfferPage />} />
        {/* Solar Industry Hub */}
        <Route path="/solar" element={<SolarIndustryHub />} />
        {/* Solar Speed-to-Lead Playbook */}
        <Route path="/solar-speed-playbook" element={<SolarSpeedToLeadPlaybook />} />
        <Route path="/solar-speed-playbook/thank-you" element={<SolarSpeedToLeadPlaybookThankYou />} />
        {/* Solar Speed-to-Lead Benchmark */}
        <Route path="/solar-benchmark" element={<SolarBenchmarkPage />} />
        {/* 5-Minute Response Playbook lead magnet */}
        <Route path="/tools/5-minute-response-playbook" element={<FiveMinuteResponsePlaybook />} />
        {/* Vet Clinic Revenue Calculator */}
        <Route path="/tools/vet-clinic-revenue-calculator" element={<VetClinicRevenueCalculator />} />
        {/* Chiropractor Patient Recovery Calculator */}
        <Route path="/tools/chiropractor-patient-recovery-calculator" element={<ChiropractorPatientRecoveryCalculator />} />
        {/* Auto Repair Missed Call Calculator */}
        <Route path="/tools/auto-repair-missed-call-calculator" element={<AutoRepairMissedCallCalculator />} />
        <Route path="/tools/roofing-missed-lead-calculator" element={<RoofingMissedLeadCalculator />} />
        {/* Industry FAQ AEO pages + Vet Clinic How-To */}
        <Route element={<BlogSchemaWrapper />}>
          <Route path="/blog/ai-receptionist-hvac-faq" element={<FAQAIReceptionistHVAC />} />
          <Route path="/blog/ai-receptionist-dentist-faq" element={<FAQAIReceptionistDentist />} />
          <Route path="/blog/ai-receptionist-plumber-faq" element={<FAQAIReceptionistPlumber />} />
          <Route path="/blog/ai-receptionist-lawyer-faq" element={<FAQAIReceptionistLawyer />} />
          <Route path="/blog/ai-receptionist-medspa-faq" element={<FAQAIReceptionistMedSpa />} />
          <Route path="/blog/ai-receptionist-solar-faq" element={<FAQAIReceptionistSolar />} />
          <Route path="/blog/ai-receptionist-vet-faq" element={<FAQAIReceptionistVet />} />
          <Route path="/blog/how-to-set-up-ai-phone-answering-vet-clinic" element={<HowToAIPhoneAnsweringVetClinic />} />
                <Route path="/blog/never-miss-a-call-after-business-hours" element={<BlogNeverMissCallAfterHours />} />
                <Route path="/blog/whatsapp-appointment-booking-plumbers" element={<BlogWhatsAppAppointmentBookingPlumbers />} />
                <Route path="/blog/ai-receptionist-for-dentists" element={<BlogAIReceptionistDentists />} />
                <Route path="/blog/ai-receptionist-for-law-firms" element={<BlogAIReceptionistLawFirms />} />
        </Route>
        {/* Industry-specific calculators */}
        <Route path="/tools/dentist-chair-calculator" element={<DentistChairCalculator />} />
        <Route path="/tools/hvac-overflow-calculator" element={<HVACOverflowCalculator />} />
        <Route path="/tools/lawyer-intake-calculator" element={<LawyerIntakeCalculator />} />
        <Route path="/tools/medspa-rebooking-calculator" element={<MedSpaRebookingCalculator />} />
        <Route path="/tools/plumber-revenue-calculator" element={<PlumberRevenueCalculator />} />
        <Route path="/tools/real-estate-speed-scorecard" element={<RealEstateSpeedScorecard />} />
        <Route path="/tools/insurance-lead-response-scorecard" element={<InsuranceLeadResponseScorecard />} />
        <Route path="/tools/cleaning-service-booking-calculator" element={<CleaningServiceBookingCalculator />} />
        <Route path="/tools/solar-profit-calculator" element={<SolarProfitCalculator />} />
        <Route path="/tools/solar-quote-generator" element={<SolarQuoteGenerator />} />
        <Route path="/tools/solar-sales-closer" element={<SolarSalesCloser />} />
        <Route path="/solar-roi-calculator" element={<SolarROICalculator />} />
        <Route path="/solar-speed-score" element={<SolarSpeedScoreQuiz />} />
        <Route path="/solar-benchmark-2026" element={<SolarBenchmark2026 />} />
        {/* Landscaping Seasonal Revenue Calculator */}
        <Route path="/tools/landscaping-seasonal-revenue-calculator" element={<LandscapingSeasonalRevenueCalculator />} />
        {/* All niche tools now served by dynamic route from Supabase */}
        <Route path="/tools/:slug" element={<NicheToolPage />} />
        <Route path="/voice-agent-setup" element={<VoiceAgentOnboarding />} />
        <Route path="/ai-readiness-scorecard" element={<AiReadinessScorecard />} />
        <Route path="/ai-receptionist-roi" element={<AiReceptionistRoi />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/terms-of-service" element={<Terms />} />
        <Route path="/dpa" element={<DPA />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AeoGlobalIntro />
    </Suspense>
  );
};

const AppRoutes: React.FC = () => {
  return (
    // Suspense here: AuthProvider is lazy-loaded so Supabase only downloads
    // after the first render, not during critical-path JS parsing.
    // null fallback: Home is eagerly imported so no blank flash on the homepage.
    <Suspense fallback={null}>
      <AuthProvider>
        <Router>
          <NavigationWrapper />
        </Router>
      </AuthProvider>
    </Suspense>
  );
};

export default AppRoutes;
