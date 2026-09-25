'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudOff,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  History,
  Info,
  Languages,
  Layers,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Stethoscope,
  Upload,
  Users,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  aiScreeningService,
  AIScreeningResult,
  ANALYSIS_STAGES,
  StageInfo,
  validateRetinalFile,
  compressRetinalImage,
  DRGrade,
  HeatmapHotspot,
  ImageQualityMetrics,
  InteractiveFinding,
  generateGradCamHeatmap
} from '@/services/aiScreening'
import {
  patientStorageService,
  Patient,
  ScreeningRecord,
  Referral,
  DashboardMetrics,
} from '@/services/patientStorage'
import {
  getSampleRetinalImages,
  SampleRetinalImage
} from '@/services/sampleImages'

type View =
  | 'Dashboard'
  | 'New Screening'
  | 'Patients'
  | 'Screening History'
  | 'Referrals'
  | 'Analytics'
  | 'Settings'

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'New Screening', icon: Plus },
  { label: 'Patients', icon: Users },
  { label: 'Screening History', icon: History },
  { label: 'Referrals', icon: Network },
  { label: 'Analytics', icon: BarChart3 },
]

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="logo-mark">
        <Activity size={21} strokeWidth={2.5} />
      </div>
      <div>
        <div className="text-lg font-bold tracking-tight text-slate-900">
          Drishti<span className="text-primary">AI</span>
        </div>
        <div className="text-[10px] font-medium text-slate-500">
          RETINAL SCREENING
        </div>
      </div>
    </div>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const tone =
    risk === 'High'
      ? 'risk-high'
      : risk === 'Moderate'
      ? 'risk-moderate'
      : 'risk-low'
  return (
    <span className={`risk-badge ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {risk}
    </span>
  )
}

function RetinalImage({
  heatmap = false,
  compact = false,
  imageSrc,
  label,
  hotspots,
}: {
  heatmap?: boolean
  compact?: boolean
  imageSrc?: string | null
  label?: string
  hotspots?: HeatmapHotspot[]
}) {
  return (
    <div
      className={`retina ${compact ? 'retina-compact' : ''} ${
        heatmap ? 'retina-heatmap' : ''
      }`}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Retinal Fundus"
          className="retina-img-preview"
        />
      ) : (
        <>
          <div className="retina-vessel vessel-a" />
          <div className="retina-vessel vessel-b" />
          <div className="retina-vessel vessel-c" />
          <div className="retina-disc" />
        </>
      )}

      {heatmap && (
        <>
          {hotspots && hotspots.length > 0 ? (
            hotspots.map((h, i) => (
              <span
                key={i}
                className={`hotspot ${
                  h.intensity === 'high'
                    ? 'bg-rose-500 opacity-80'
                    : h.intensity === 'moderate'
                    ? 'bg-amber-400 opacity-70'
                    : 'bg-yellow-300 opacity-60'
                }`}
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  width: `${h.radius * 1.5}px`,
                  height: `${h.radius * 1.2}px`,
                  filter: 'blur(4px)',
                }}
                title={h.findingType}
              />
            ))
          ) : (
            <>
              <span className="hotspot one" />
              <span className="hotspot two" />
              <span className="hotspot three" />
            </>
          )}
        </>
      )}

      <span className="retina-label">
        {label || (heatmap ? 'ATTENTION MAP' : 'OD · RIGHT EYE')}
      </span>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'blue',
}: {
  icon: any
  label: string
  value: string
  detail: string
  tone?: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

function PatientJourney({ current = 3 }: { current?: number }) {
  const steps = [
    'Screened',
    'AI analyzed',
    'Risk identified',
    'Explained',
    'Referred',
  ]
  return (
    <section className="journey-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-kicker">PATIENT JOURNEY</div>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            Sunita Patil · DR-24081
          </p>
        </div>
        <span className="journey-handoff">Clinical handoff ready</span>
      </div>
      <div className="journey-steps">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`journey-step ${index < current ? 'complete' : ''} ${
              index === current ? 'current' : ''
            }`}
          >
            <span>{index < current ? '✓' : index + 1}</span>
            <small>{label}</small>
            {index < steps.length - 1 && <i />}
          </div>
        ))}
      </div>
    </section>
  )
}

function ImpactSection({ metrics }: { metrics?: DashboardMetrics }) {
  const m = metrics || patientStorageService.getDashboardMetrics()
  const totalScreened = m.screeningsCount
  const highRisk = m.pendingReviewCount
  const referrals = m.activeReferralsCount
  const villages = m.villagesCount
  const timeSaved = (5.2 + totalScreened * 0.01).toFixed(1) + 'h'

  return (
    <div className="impact-grid">
      <section className="panel impact-panel">
        <div className="section-kicker">PROGRAMME IMPACT · NASHIK DISTRICT</div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">
          Making early screening reachable
        </h2>
        <div className="impact-metrics">
          <div>
            <strong>{totalScreened}</strong>
            <span>patients screened</span>
          </div>
          <div>
            <strong>{highRisk}</strong>
            <span>potential high-risk cases</span>
          </div>
          <div>
            <strong>{referrals}</strong>
            <span>referrals generated</span>
          </div>
          <div>
            <strong>{villages}</strong>
            <span>villages covered</span>
          </div>
          <div>
            <strong>{timeSaved}</strong>
            <span>screening time saved</span>
          </div>
        </div>
      </section>
      <section className="panel rural-panel">
        <div className="section-kicker">RURAL ADVANTAGE</div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">
          Designed for the last mile
        </h2>
        <div className="rural-tags">
          <span>
            <CloudOff size={14} />
            Offline-first
          </span>
          <span>
            <Languages size={14} />
            Multilingual
          </span>
          <span>
            <Camera size={14} />
            Portable
          </span>
          <span>
            <ShieldCheck size={14} />
            Explainable AI
          </span>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Low-bandwidth workflows keep community screening moving, even when
          the network does not.
        </p>
      </section>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      width="85"
      height="58"
      viewBox="0 0 85 58"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 29C17 7 68 7 80 29C68 51 17 51 5 29Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="42.5"
        cy="29"
        r="13"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="42.5"
        cy="29"
        r="5"
        fill="currentColor"
        opacity=".8"
      />
      <path
        d="M42.5 16V9M42.5 49v-7M29.5 29h-7M63 29h-7"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity=".55"
      />
    </svg>
  )
}

export default function Page() {
  const [view, setView] = useState<View>('Dashboard')
  const [showScreening, setShowScreening] = useState(false)
  const [step, setStep] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const [explainModalOpen, setExplainModalOpen] = useState(false)

  // Central Application Data from persistent storage
  const [patientsList, setPatientsList] = useState<Patient[]>([])
  const [screeningsList, setScreeningsList] = useState<ScreeningRecord[]>([])
  const [referralsList, setReferralsList] = useState<Referral[]>([])

  // Modal inspection states
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<Patient | null>(null)
  const [selectedScreeningForDetails, setSelectedScreeningForDetails] = useState<ScreeningRecord | null>(null)
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false)
  const [isNewReferralModalOpen, setIsNewReferralModalOpen] = useState(false)
  const [detailImageSrc, setDetailImageSrc] = useState<string | null>(null)

  // Field readiness & audit modals
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [languageModalOpen, setLanguageModalOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'HI' | 'MR'>('EN')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [coverageModalOpen, setCoverageModalOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastSyncedText, setLastSyncedText] = useState('Just now')
  const [isSyncing, setIsSyncing] = useState(false)

  // Active screening state
  const [activePatient, setActivePatient] = useState<Patient | null>(null)
  const [activeResult, setActiveResult] = useState<AIScreeningResult | null>(null)
  const [activeImages, setActiveImages] = useState<{
    rightEye?: string | null
    leftEye?: string | null
  }>({})

  useEffect(() => {
    // Initial fetch from storage service
    const pts = patientStorageService.getPatients()
    setPatientsList(pts)
    const scrs = patientStorageService.getScreenings()
    setScreeningsList(scrs)
    const refs = patientStorageService.getReferrals()
    setReferralsList(refs)
    if (pts.length > 0 && !activePatient) {
      setActivePatient(pts[0])
    }

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  const reloadData = () => {
    setPatientsList(patientStorageService.getPatients())
    setScreeningsList(patientStorageService.getScreenings())
    setReferralsList(patientStorageService.getReferrals())
  }

  const handleSyncNow = () => {
    setIsSyncing(true)
    setTimeout(() => {
      reloadData()
      setIsSyncing(false)
      setLastSyncedText('Just now')
    }, 800)
  }

  const startScreening = (patientToUse?: Patient) => {
    const newId = patientStorageService.generateNewPatientId()
    const p = patientToUse || activePatient || patientsList[0] || {
      id: newId,
      patientId: newId,
      name: '',
      age: 50,
      gender: 'Female',
      village: 'Sinnar',
      phone: '',
      diabetesDuration: '5 years',
      hba1c: '7.5%',
      previousEyeExam: '1-2 years',
      knownDiabeticRetinopathy: 'Unsure',
      symptoms: ['Mild blurred vision'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setActivePatient(p)
    setView('New Screening')
    setShowScreening(true)
    setStep(1)
    setActiveResult(null)
  }

  const activeReferralsCount = referralsList.filter(r => r.status !== 'Completed').length

  const pageTitle =
    view === 'Dashboard' ? 'Good morning, Health Worker' : view

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="sidebar-rule" />
        <div className="workspace-label">WORKSPACE</div>
        <nav className="space-y-1">
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setView(label as View)
                setShowScreening(label === 'New Screening')
                if (label === 'New Screening') setStep(1)
              }}
              className={`nav-item ${view === label ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Referrals' && (
                <span className="nav-count">{activeReferralsCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            onClick={() => setHelpModalOpen(true)}
            className="nav-item"
            aria-label="Help & Clinical Support Guide"
          >
            <CircleHelp size={18} />
            <span>Help & Support</span>
          </button>
          <button
            onClick={() => setView('Settings')}
            className={`nav-item ${view === 'Settings' ? 'active' : ''}`}
            aria-label="Application Settings"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="profile">
            <div className="avatar">RK</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">
                Ravi Kumar
              </div>
              <div className="truncate text-xs text-slate-500">
                ASHA Worker · PHC Nashik
              </div>
            </div>
            <MoreHorizontal size={18} className="ml-auto text-slate-400" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{view}</strong>
            </div>
          </div>
          <div className="top-actions">
            <div className="connection">
              <span
                className={`connection-dot ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {isOnline ? (
                <>
                  Connected{' '}
                  <span className="hidden sm:inline">
                    · Synced {lastSyncedText}
                  </span>
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="ml-1 text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    title="Force sync records with Nashik District Portal"
                    aria-label="Synchronize data now"
                  >
                    <RefreshCw
                      size={11}
                      className={isSyncing ? 'animate-spin' : ''}
                    />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                </>
              ) : (
                <>
                  Offline{' '}
                  <span className="hidden sm:inline">
                    · Storage active ({screeningsList.length} cached)
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => setNotificationsOpen(true)}
              className="icon-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <button
              onClick={() => setLanguageModalOpen(true)}
              className="language"
              aria-label="Select interface language"
            >
              <Languages size={17} />
              {selectedLanguage} <ChevronRight size={13} className="rotate-90" />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="mobile-nav">
            {nav.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  setView(label as View)
                  setMenuOpen(false)
                  setShowScreening(label === 'New Screening')
                  if (label === 'New Screening') setStep(1)
                }}
                className={`nav-item ${view === label ? 'active' : ''}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                setView('Settings')
                setMenuOpen(false)
              }}
              className={`nav-item ${view === 'Settings' ? 'active' : ''}`}
            >
              <Settings size={18} />
              Settings
            </button>
            <button
              onClick={() => {
                setHelpModalOpen(true)
                setMenuOpen(false)
              }}
              className="nav-item"
            >
              <CircleHelp size={18} />
              Help & Support
            </button>
          </div>
        )}

        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow text-primary">
                {view === 'Dashboard'
                  ? 'TUESDAY, 24 SEPTEMBER 2024'
                  : 'DRISHTIAI WORKSPACE'}
              </p>
              <h1>{pageTitle}</h1>
              {view === 'Dashboard' && (
                <p className="subtitle">
                  <Stethoscope size={15} /> Primary Health Centre <span>•</span>{' '}
                  Nashik, Maharashtra
                </p>
              )}
            </div>
            {view === 'Dashboard' && (
              <Button onClick={() => startScreening()} className="primary-button">
                <Plus size={18} /> New screening
              </Button>
            )}
          </div>

          {view === 'Dashboard' && (
            <DashboardView
              patients={patientsList}
              screenings={screeningsList}
              referrals={referralsList}
              startScreening={startScreening}
              onHistory={() => setView('Screening History')}
              onViewPatientProfile={(p) => setSelectedPatientForProfile(p)}
              onViewScreeningDetails={(s) => setSelectedScreeningForDetails(s)}
              onCoverageDetails={() => setCoverageModalOpen(true)}
            />
          )}

          {view !== 'Dashboard' && (
            <SectionView
              view={view}
              patients={patientsList}
              screenings={screeningsList}
              referrals={referralsList}
              startScreening={startScreening}
              onUpdatePatients={reloadData}
              onUpdateReferrals={reloadData}
              onExplain={(result, img) => {
                if (result) setActiveResult(result)
                if (img) setDetailImageSrc(img)
                setExplainModalOpen(true)
              }}
              onViewPatientProfile={(p) => setSelectedPatientForProfile(p)}
              onViewScreeningDetails={(s) => setSelectedScreeningForDetails(s)}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
              onOpenNewReferral={() => setIsNewReferralModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Patient Profile Modal */}
      {selectedPatientForProfile && (
        <PatientProfileModal
          patient={selectedPatientForProfile}
          screenings={screeningsList}
          onClose={() => setSelectedPatientForProfile(null)}
          onSave={(updated) => {
            patientStorageService.updatePatient(updated.id, updated)
            reloadData()
            setSelectedPatientForProfile(updated)
          }}
          onStartScreening={(p) => {
            setSelectedPatientForProfile(null)
            startScreening(p)
          }}
          onViewScreeningDetails={(s) => {
            setSelectedScreeningForDetails(s)
          }}
        />
      )}

      {/* Screening Details Modal */}
      {selectedScreeningForDetails && (
        <ScreeningDetailsModal
          screening={selectedScreeningForDetails}
          onClose={() => setSelectedScreeningForDetails(null)}
          onExplain={(res, img) => {
            if (res) setActiveResult(res)
            if (img) setDetailImageSrc(img)
            setExplainModalOpen(true)
          }}
        />
      )}

      {/* Register New Patient Modal */}
      {isNewPatientModalOpen && (
        <NewPatientModal
          onClose={() => setIsNewPatientModalOpen(false)}
          onCreated={(newP) => {
            reloadData()
            setIsNewPatientModalOpen(false)
          }}
        />
      )}

      {/* New Referral Modal */}
      {isNewReferralModalOpen && (
        <NewReferralModal
          patients={patientsList}
          screenings={screeningsList}
          onClose={() => setIsNewReferralModalOpen(false)}
          onCreated={() => {
            reloadData()
            setIsNewReferralModalOpen(false)
          }}
        />
      )}

      {/* Complete Functional Screening Modal Flow */}
      {showScreening && activePatient && (
        <ScreeningModal
          step={step}
          setStep={setStep}
          patient={activePatient}
          setPatient={setActivePatient}
          patientsList={patientsList}
          onUpdatePatientsList={reloadData}
          activeResult={activeResult}
          setActiveResult={setActiveResult}
          images={activeImages}
          setImages={setActiveImages}
          onClose={() => {
            setShowScreening(false)
            setView('Dashboard')
          }}
          onExplain={() => setExplainModalOpen(true)}
        />
      )}

      {/* Explainable AI Modal */}
      {explainModalOpen && (
        <ExplanationModal
          result={activeResult}
          imageSrc={detailImageSrc || activeImages.rightEye || activeImages.leftEye}
          onClose={() => {
            setExplainModalOpen(false)
            setDetailImageSrc(null)
          }}
        />
      )}

      {/* Field Clinical Support & Protocol Guide Modal */}
      {helpModalOpen && (
        <HelpSupportModal onClose={() => setHelpModalOpen(false)} />
      )}

      {/* Language Selection Modal */}
      {languageModalOpen && (
        <LanguageModal
          currentLanguage={selectedLanguage}
          onSelect={(lang) => setSelectedLanguage(lang)}
          onClose={() => setLanguageModalOpen(false)}
        />
      )}

      {/* Notifications Drawer Modal */}
      {notificationsOpen && (
        <NotificationsModal onClose={() => setNotificationsOpen(false)} />
      )}

      {/* Coverage Directory Modal */}
      {coverageModalOpen && (
        <CoverageModal
          metrics={patientStorageService.getDashboardMetrics()}
          onClose={() => setCoverageModalOpen(false)}
        />
      )}
    </div>
  )
}

function DashboardView({
  patients,
  screenings,
  referrals,
  startScreening,
  onHistory,
  onViewPatientProfile,
  onViewScreeningDetails,
  onCoverageDetails,
}: {
  patients: Patient[]
  screenings: ScreeningRecord[]
  referrals: Referral[]
  startScreening: (p?: Patient) => void
  onHistory: () => void
  onViewPatientProfile?: (p: Patient) => void
  onViewScreeningDetails?: (s: ScreeningRecord) => void
  onCoverageDetails?: () => void
}) {
  const metrics = patientStorageService.getDashboardMetrics()

  return (
    <div className="space-y-6">
      <PatientJourney current={1} />
      <ImpactSection metrics={metrics} />

      <div className="stat-grid">
        <StatCard
          icon={Users}
          label="SCREENINGS THIS MONTH"
          value={metrics.screeningsCount.toString()}
          detail="↑ 18% from last month"
        />
        <StatCard
          icon={Clock3}
          label="PENDING REVIEW"
          value={metrics.pendingReviewCount.toString()}
          detail="Needs attention today"
          tone="amber"
        />
        <StatCard
          icon={ShieldCheck}
          label="LOW RISK DETECTED"
          value={`${metrics.lowRiskPercentage}%`}
          detail={`${Math.round((metrics.lowRiskPercentage / 100) * metrics.screeningsCount)} screenings`}
          tone="teal"
        />
        <StatCard
          icon={Network}
          label="ACTIVE REFERRALS"
          value={metrics.activeReferralsCount.toString()}
          detail={`${referrals.filter(r => r.priority === 'High').length} high priority`}
          tone="red"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="panel hero-panel">
          <div className="flex items-start justify-between">
            <div>
              <div className="section-kicker">
                <span className="live-pulse" /> TODAY&apos;S FIELD WORK
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">
                Ready for your next screening?
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                Capture retinal images and let DrishtiAI help you identify early
                signs of diabetic retinopathy with explainable AI.
              </p>
            </div>
            <div className="hero-symbol">
              <EyeIcon />
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => startScreening()}
              className="primary-button"
            >
              <Camera size={17} /> Start screening
            </Button>
            <button onClick={onHistory} className="secondary-button">
              View today&apos;s queue <ArrowRight size={16} />
            </button>
          </div>
          <div className="mt-7 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <CloudOff size={15} className="text-teal-600" /> Works offline ·
            Results sync automatically when connected
          </div>
        </section>

        <section className="panel coverage-panel">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-kicker">YOUR COVERAGE</div>
              <h2 className="mt-2 text-lg font-bold text-slate-900">
                Nashik district
              </h2>
            </div>
            <button
              onClick={onCoverageDetails}
              className="icon-button"
              aria-label="View coverage details"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="coverage-map">
            <div className="map-shape">
              <span className="map-dot d1" />
              <span className="map-dot d2" />
              <span className="map-dot d3" />
              <span className="map-dot d4" />
            </div>
            <div className="map-tooltip">
              Nashik
              <br />
              <strong>{metrics.screeningsCount} screened</strong>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">Villages reached</span>
            <strong className="text-slate-800">
              {metrics.villagesCount} <span className="font-normal text-teal-600">/ 30</span>
            </strong>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent screenings</h2>
              <p>Latest patient assessments from your centre</p>
            </div>
            <button
              onClick={onHistory}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Screened</th>
                  <th>Risk level</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {screenings.length > 0 ? (
                  screenings.slice(0, 4).map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => onViewScreeningDetails ? onViewScreeningDetails(s) : onHistory()}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="patient-avatar">
                            {s.patientName
                              ? s.patientName
                                  .split(' ')
                                  .map((x) => x[0])
                                  .join('')
                              : 'PT'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {s.patientName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {s.patientId} · {s.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-slate-500">
                        {s.date || 'Today'}
                      </td>
                      <td>
                        <RiskBadge risk={s.aiResult?.riskLevel || (s.severity === 'severe' ? 'High' : s.severity === 'moderate' ? 'Moderate' : 'Low')} />
                      </td>
                      <td className="hidden text-xs text-slate-500 sm:table-cell">
                        {s.severityLabel || s.aiResult?.severityLabel || 'Screening complete'}
                      </td>
                      <td>
                        <ChevronRight size={16} className="text-slate-400" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                      No screening assessments recorded yet. Click &quot;Start screening&quot; to begin your first evaluation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Weekly activity</h2>
              <p>Screenings completed this week</p>
            </div>
            <span className="chart-total">{metrics.screeningsCount}</span>
          </div>
          <div className="bar-chart">
            {metrics.weeklyDistribution.map((h, i) => (
              <div className="bar-column" key={i}>
                <div
                  className={`bar ${i === 5 ? 'today' : ''}`}
                  style={{ height: `${Math.min(h, 100)}%` }}
                />
                <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot blue" />
              Screenings
            </span>
            <span>
              <i className="legend-dot teal" />
              Target: 40
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

function SectionView({
  view,
  patients,
  screenings,
  referrals,
  startScreening,
  onUpdatePatients,
  onUpdateReferrals,
  onExplain,
  onViewPatientProfile,
  onViewScreeningDetails,
  onOpenNewPatient,
  onOpenNewReferral,
}: {
  view: View
  patients: Patient[]
  screenings: ScreeningRecord[]
  referrals: Referral[]
  startScreening: (p?: Patient) => void
  onUpdatePatients: () => void
  onUpdateReferrals: () => void
  onExplain: (res?: AIScreeningResult, img?: string | null) => void
  onViewPatientProfile: (p: Patient) => void
  onViewScreeningDetails: (s: ScreeningRecord) => void
  onOpenNewPatient: () => void
  onOpenNewReferral: () => void
}) {
  const [patientSearch, setPatientSearch] = useState('')
  const [screeningSearch, setScreeningSearch] = useState('')

  if (view === 'New Screening') {
    return (
      <div className="panel max-w-3xl">
        <div className="screening-intro">
          <div className="big-icon">
            <Camera size={24} />
          </div>
          <div>
            <h2>Start a new retinal screening</h2>
            <p>
              Select or register a patient, capture high-resolution fundus images,
              evaluate image quality, and receive an instant explainable AI DR
              classification.
            </p>
          </div>
        </div>
        <div className="workflow-steps">
          <span className="current">
            1 <b>Patient details</b>
          </span>
          <i />
          <span>
            2 <b>Capture images</b>
          </span>
          <i />
          <span>
            3 <b>AI analysis & referral</b>
          </span>
        </div>
        <div className="form-grid">
          <label>
            Patient full name
            <input
              readOnly
              value={patients[0]?.name || 'Sunita Patil'}
              className="bg-slate-50 cursor-pointer"
              onClick={() => startScreening(patients[0])}
            />
          </label>
          <label>
            Patient ID
            <input
              readOnly
              value={patients[0]?.patientId || patients[0]?.id || 'DR-24081'}
              className="bg-slate-50 cursor-pointer"
              onClick={() => startScreening(patients[0])}
            />
          </label>
          <label>
            Age
            <input
              readOnly
              value={patients[0]?.age || 54}
              className="bg-slate-50 cursor-pointer"
              onClick={() => startScreening(patients[0])}
            />
          </label>
          <label>
            Village / location
            <input
              readOnly
              value={patients[0]?.village || 'Sinnar'}
              className="bg-slate-50 cursor-pointer"
              onClick={() => startScreening(patients[0])}
            />
          </label>
        </div>
        <Button
          onClick={() => startScreening(patients[0])}
          className="primary-button mt-6"
        >
          Open Screening Workflow <ArrowRight size={17} />
        </Button>
      </div>
    )
  }

  // Filter patients by search query
  const displayPatients = patientSearch.trim()
    ? patientStorageService.getPatients(patientSearch)
    : patients

  // Filter screenings by search query
  const displayScreenings = screeningSearch.trim()
    ? screenings.filter(
        (s) =>
          s.patientName.toLowerCase().includes(screeningSearch.toLowerCase()) ||
          s.patientId.toLowerCase().includes(screeningSearch.toLowerCase()) ||
          s.id.toLowerCase().includes(screeningSearch.toLowerCase())
      )
    : screenings

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>
              {view === 'Patients'
                ? 'Patient registry'
                : view === 'Screening History'
                ? 'Screening assessments'
                : view === 'Settings'
                ? 'System settings & local database'
                : view}
            </h2>
            <p>
              {view === 'Screening History'
                ? 'A complete persistent record of all retinal evaluations conducted at your centre'
                : view === 'Patients'
                ? 'Comprehensive directory of registered diabetic patients across Nashik district'
                : view === 'Referrals'
                ? 'Track, triage, and manage secondary & tertiary ophthalmic referrals'
                : view === 'Settings'
                ? 'Configure PHC facility, review AI service connection, and manage local storage'
                : 'Monitor and manage your community eye health programme.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === 'Patients' && (
              <>
                <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-xs text-slate-700">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search name, ID, village, phone..."
                    className="outline-none text-xs w-44 sm:w-56"
                  />
                  {patientSearch && (
                    <button
                      onClick={() => setPatientSearch('')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <Button
                  onClick={onOpenNewPatient}
                  className="secondary-button"
                >
                  <Plus size={16} /> Register Patient
                </Button>
                <Button
                  onClick={() => startScreening()}
                  className="primary-button"
                >
                  <Plus size={17} /> New screening
                </Button>
              </>
            )}

            {view === 'Screening History' && (
              <>
                <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-xs text-slate-700">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    value={screeningSearch}
                    onChange={(e) => setScreeningSearch(e.target.value)}
                    placeholder="Search patient, ID, or screening..."
                    className="outline-none text-xs w-44 sm:w-56"
                  />
                  {screeningSearch && (
                    <button
                      onClick={() => setScreeningSearch('')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => startScreening()}
                  className="primary-button"
                >
                  <Plus size={17} /> New screening
                </Button>
              </>
            )}

            {view === 'Referrals' && (
              <>
                <Button
                  onClick={onOpenNewReferral}
                  className="secondary-button"
                >
                  <Plus size={16} /> Create Referral
                </Button>
                <Button
                  onClick={() => startScreening()}
                  className="primary-button"
                >
                  <Plus size={17} /> New screening
                </Button>
              </>
            )}
          </div>
        </div>

        {view === 'Analytics' ? (
          <AnalyticsView metrics={patientStorageService.getDashboardMetrics()} />
        ) : view === 'Settings' ? (
          <SettingsView onResetData={onUpdatePatients} />
        ) : view === 'Referrals' ? (
          <ReferralsView
            referrals={referrals}
            onUpdateReferrals={onUpdateReferrals}
            onStartScreening={startScreening}
            onOpenNewReferral={onOpenNewReferral}
          />
        ) : view === 'Screening History' ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date screened</th>
                  <th>Risk level</th>
                  <th>Severity / Status</th>
                  <th>Recommendation</th>
                  <th>Referral</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {displayScreenings.length > 0 ? (
                  displayScreenings.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="patient-avatar">
                            {s.patientName
                              ? s.patientName
                                  .split(' ')
                                  .map((x) => x[0])
                                  .join('')
                              : 'PT'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {s.patientName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {s.patientId} · {s.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500 whitespace-nowrap">
                        {s.date || 'Today'}
                      </td>
                      <td>
                        <RiskBadge
                          risk={
                            s.aiResult?.riskLevel ||
                            (s.severity === 'severe'
                              ? 'High'
                              : s.severity === 'moderate'
                              ? 'Moderate'
                              : 'Low')
                          }
                        />
                      </td>
                      <td className="text-xs text-slate-600 font-medium">
                        {s.severityLabel || s.aiResult?.severityLabel || 'Screened'}
                      </td>
                      <td className="text-xs text-slate-500 max-w-xs truncate">
                        {s.recommendation?.label ||
                          s.aiResult?.recommendationLabel ||
                          'Routine monitoring'}
                      </td>
                      <td>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            s.referralStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.referralStatus === 'Scheduled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : s.referralStatus === 'Pending Review'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {s.referralStatus || 'None'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button
                          onClick={() => onViewScreeningDetails(s)}
                          className="text-xs font-semibold text-primary hover:underline mr-3"
                        >
                          Details →
                        </button>
                        <button
                          onClick={() =>
                            onExplain(
                              s.aiResult,
                              s.rightEyeImage || s.leftEyeImage
                            )
                          }
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                        >
                          Explain AI
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-xs text-slate-400"
                    >
                      No screening assessments match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Patients Registry View */
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone / Village</th>
                  <th>Diabetes Duration</th>
                  <th>HbA1c</th>
                  <th>Last Screened</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayPatients.length > 0 ? (
                  displayPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="patient-avatar">
                            {p.name
                              ? p.name
                                  .split(' ')
                                  .map((x) => x[0])
                                  .join('')
                              : 'PT'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {p.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {p.patientId || p.id} · {p.age} yrs · {p.gender}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-500">
                        <div className="font-medium text-slate-700">
                          {p.phone || '+91 98231 44521'}
                        </div>
                        <div className="text-slate-400">{p.village}</div>
                      </td>
                      <td className="text-xs text-slate-600">
                        {p.diabetesDuration || 'Not recorded'}
                      </td>
                      <td className="text-xs font-semibold text-slate-700">
                        {p.hba1c || '—'}
                      </td>
                      <td className="text-xs text-slate-500">
                        {p.lastScreened || 'Pending'}
                      </td>
                      <td>
                        <RiskBadge risk={p.lastRisk || 'Moderate'} />
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onViewPatientProfile(p)}
                            className="secondary-button small"
                          >
                            Profile
                          </button>
                          <Button
                            onClick={() => startScreening(p)}
                            className="primary-button small"
                          >
                            Screen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-xs text-slate-400"
                    >
                      No registered patients match &quot;{patientSearch}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsView({ metrics }: { metrics?: DashboardMetrics }) {
  const m = metrics || patientStorageService.getDashboardMetrics()
  return (
    <div className="space-y-6">
      <div className="analytics-grid">
        <div className="analytics-number">
          <span>Total screenings completed</span>
          <strong>{m.screeningsCount}</strong>
          <small className="text-teal-600">↑ 24.8% this quarter</small>
        </div>
        <div className="analytics-chart">
          <div className="line-chart">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none">
              <path
                d="M0 130 C50 120 65 95 110 105 S170 60 220 78 S275 45 320 62 S375 20 420 38 S465 28 500 8"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
              />
              <path
                d="M0 130 C50 120 65 95 110 105 S170 60 220 78 S275 45 320 62 S375 20 420 38 S465 28 500 8 V150 H0Z"
                fill="url(#chartFill)"
                opacity=".18"
              />
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#2161d1" />
                  <stop offset="1" stopColor="#2161d1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Risk Stratification</div>
          <div className="mt-2 text-2xl font-bold text-teal-600">{m.lowRiskPercentage}%</div>
          <p className="text-xs text-slate-500 mt-1">Classified low risk / routine annual monitoring</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Referral Rate</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{100 - m.lowRiskPercentage}%</div>
          <p className="text-xs text-slate-500 mt-1">{m.activeReferralsCount} active specialist referrals under tracking</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Rural Coverage</div>
          <div className="mt-2 text-2xl font-bold text-primary">{m.villagesCount} Villages</div>
          <p className="text-xs text-slate-500 mt-1">Covering primary care sub-centres across Nashik</p>
        </div>
      </div>
    </div>
  )
}

function SettingsView({ onResetData }: { onResetData: () => void }) {
  const [stats, setStats] = useState(patientStorageService.getStorageStats())
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleReset = () => {
    patientStorageService.resetDemoData()
    setStats(patientStorageService.getStorageStats())
    onResetData()
    setShowConfirmReset(false)
    setResetSuccess(true)
    setTimeout(() => setResetSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      {resetSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-2">
          <Check size={16} /> Demo data successfully reset to initial state!
        </div>
      )}

      {/* Facility & Health Worker Configuration */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-bold text-slate-800">Primary Health Centre Profile</h3>
            <p className="text-xs text-slate-500">Operating centre details and field jurisdiction</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold">
            Active Sub-Centre
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-medium">Healthcare Worker</span>
            <div className="font-bold text-slate-800 mt-1 text-sm">Ravi Kumar (ASHA Worker)</div>
            <div className="text-slate-500 text-[11px] mt-0.5">ID: ASHA-MH-2021-994 · Trained DR Screener</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-medium">Facility / District</span>
            <div className="font-bold text-slate-800 mt-1 text-sm">PHC Sinnar, Nashik District</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Civil Hospital Referral Network, Maharashtra</div>
          </div>
        </div>
      </div>

      {/* AI Inference Architecture */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-bold text-slate-800">AI Inference & Explainability Architecture</h3>
            <p className="text-xs text-slate-500">Status of DR deep learning classification & Grad-CAM pipeline</p>
          </div>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold flex items-center gap-1.5">
            <Cpu size={14} /> DrishtiAI-Retina-v1.0
          </span>
        </div>
        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <div className="font-bold text-slate-800">API Endpoint</div>
              <div className="text-slate-500 text-[11px]">POST /api/screening/analyze (Next.js Edge/Node Route)</div>
            </div>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <div className="font-bold text-slate-800">FastAPI ML Backend & PyTorch Inference</div>
              <div className="text-slate-500 text-[11px]">ResNet-50 Classifier + Grad-CAM Explainability Service</div>
            </div>
            <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Standby / Offline Fallback Active
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <div className="font-bold text-slate-800">Quality Assessment Engine</div>
              <div className="text-slate-500 text-[11px]">Canvas focus, exposure, and illumination grading</div>
            </div>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Online
            </span>
          </div>
        </div>
      </div>

      {/* Local Storage Database Persistence */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-bold text-slate-800">Local Storage Persistence & Offline Sync</h3>
            <p className="text-xs text-slate-500">Browser-persisted database for rural offline field use</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400">Patients</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{stats.patientsCount}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400">Screenings</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{stats.screeningsCount}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400">Referrals</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{stats.referralsCount}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400">Storage Used</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">~{stats.approxStorageKb} KB</div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800">Reset Demo Data</div>
            <div className="text-[11px] text-slate-500">Revert all patients, screenings, and referrals to default test seed data</div>
          </div>
          {showConfirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-600 font-semibold">Are you sure?</span>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 shadow-sm"
              >
                Yes, Reset Data
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="px-3 py-1.5 border border-rose-200 text-rose-700 bg-rose-50/60 rounded text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Reset Demo Data
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function HelpSupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal max-w-2xl">
        <div className="modal-top">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center font-bold">
              <CircleHelp size={18} />
            </div>
            <div>
              <span className="eyebrow text-primary">FIELD PROTOCOL & SUPPORT</span>
              <h2>Healthcare Worker Clinical Guide</h2>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close help">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs text-slate-600">
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              Diabetic Retinopathy Screening Guidelines (NPCB / WHO)
            </h4>
            <p className="leading-relaxed">
              Every patient with Type 2 Diabetes should undergo annual retinal screening. 
              Screen both eyes (Right eye: OD, Left eye: OS). Center the optic disc and macula within the 45° field of view.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-3">
            <h4 className="font-bold text-slate-800 mb-2">Fundus Photography Best Practices</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600">
              <li>Ensure patient is seated comfortably in a dim examination room for natural pupil dilation.</li>
              <li>Clean the camera objective lens with microfiber cloth before each session to avoid artifact rings.</li>
              <li>Instruct patient to fixate on the internal green fixation target.</li>
              <li>Re-capture if the image quality score falls below 70% or if corneal glare obscures the macula.</li>
            </ul>
          </div>

          <div className="border border-slate-200 rounded-lg p-3">
            <h4 className="font-bold text-slate-800 mb-2">Tele-Ophthalmology Referral Directory</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <div>
                  <strong className="text-slate-800">District Hospital Eye OPD, Nashik</strong>
                  <div className="text-[11px] text-slate-400">Dr. V. Deshpande (Vitreoretinal Specialist)</div>
                </div>
                <span className="text-primary font-mono font-semibold">+91 253 257 3201</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <div>
                  <strong className="text-slate-800">Civil Hospital Vitreo-Retinal Unit</strong>
                  <div className="text-[11px] text-slate-400">Emergency & High-Risk DR Referrals</div>
                </div>
                <span className="text-primary font-mono font-semibold">+91 253 257 8844</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <div>
                  <strong className="text-slate-800">PHC Sinnar Ophthalmic Assistant</strong>
                  <div className="text-[11px] text-slate-400">Primary Health Centre Consultation</div>
                </div>
                <span className="text-primary font-mono font-semibold">+91 2551 220 145</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="primary-button">
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}

function LanguageModal({
  currentLanguage,
  onSelect,
  onClose,
}: {
  currentLanguage: 'EN' | 'HI' | 'MR'
  onSelect: (lang: 'EN' | 'HI' | 'MR') => void
  onClose: () => void
}) {
  const languages: { code: 'EN' | 'HI' | 'MR'; label: string; sub: string }[] = [
    { code: 'EN', label: 'English', sub: 'Standard clinical terminology' },
    { code: 'HI', label: 'हिंदी (Hindi)', sub: 'स्वास्थ्य कार्यकर्ता इंटरफेस' },
    { code: 'MR', label: 'मराठी (Marathi)', sub: 'आरोग्य सेविका इंटरफेस (महाराष्ट्र)' },
  ]

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-sm">
        <div className="modal-top">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-primary" />
            <div>
              <span className="eyebrow text-primary">LOCALIZATION</span>
              <h2>Select Language</h2>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close language selector">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onSelect(l.code)
                onClose()
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                currentLanguage === l.code
                  ? 'border-primary bg-primary/5 text-slate-900 font-bold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div>
                <div className="text-sm">{l.label}</div>
                <div className="text-[11px] text-slate-500">{l.sub}</div>
              </div>
              {currentLanguage === l.code && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
  const notifications = [
    {
      id: 'n1',
      title: 'Urgent Referral Scheduled',
      time: '15 minutes ago',
      detail: 'Meena Shinde (DR-24079) appointment confirmed at District Hospital Eye OPD.',
      badge: 'High Priority',
      badgeTone: 'risk-high',
    },
    {
      id: 'n2',
      title: 'Field Sync Completed',
      time: '1 hour ago',
      detail: '5 screening records successfully synced with Nashik Tele-ophthalmology server.',
      badge: 'Synced',
      badgeTone: 'risk-low',
    },
    {
      id: 'n3',
      title: 'Annual Rescreening Due',
      time: 'Yesterday',
      detail: '3 registered diabetic patients in Sinnar village are due for annual eye checkup.',
      badge: 'Notice',
      badgeTone: 'risk-moderate',
    },
  ]

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-md">
        <div className="modal-top">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <div>
              <span className="eyebrow text-primary">NOTIFICATIONS</span>
              <h2>Field Alerts & Updates</h2>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close notifications">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mt-4 text-xs">
          {notifications.map((n) => (
            <div key={n.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{n.title}</span>
                <span className={`risk-badge ${n.badgeTone} text-[10px]`}>{n.badge}</span>
              </div>
              <p className="text-slate-600 mt-1 leading-relaxed">{n.detail}</p>
              <div className="text-[10px] text-slate-400 mt-1.5">{n.time}</div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="primary-button">
            Close Alerts
          </button>
        </div>
      </div>
    </div>
  )
}

function CoverageModal({ onClose, metrics }: { onClose: () => void; metrics: DashboardMetrics }) {
  const villages = [
    { name: 'Sinnar Sub-Centre', screened: 48, status: 'Active Outreach' },
    { name: 'Niphad Health Post', screened: 35, status: 'Active Outreach' },
    { name: 'Dindori Primary Centre', screened: 24, status: 'Active Outreach' },
    { name: 'Yeola Sub-Centre', screened: 19, status: 'Monthly Camp' },
    { name: 'Igatpuri Tribal Health Post', screened: 16, status: 'Special Outreach' },
    { name: 'Trimbak Health Post', screened: 12, status: 'Scheduled' },
    { name: 'Kalwan Rural Centre', screened: 8, status: 'Scheduled' },
  ]

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-lg">
        <div className="modal-top">
          <div>
            <span className="eyebrow text-primary">COVERAGE DIRECTORY</span>
            <h2>Nashik District Field Coverage</h2>
            <p className="text-xs text-slate-500">Sub-centres and rural villages under active screening coverage</p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close coverage details">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
              <span className="text-slate-500">Total Field Screenings</span>
              <div className="text-lg font-bold text-primary mt-0.5">{metrics.screeningsCount}</div>
            </div>
            <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100">
              <span className="text-slate-500">Villages Reached</span>
              <div className="text-lg font-bold text-teal-700 mt-0.5">{metrics.villagesCount} / 30</div>
            </div>
          </div>

          <div className="table-wrap max-h-60 overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>Village / Sub-Centre</th>
                  <th>Screened</th>
                  <th>Coverage Status</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-slate-800">{v.name}</td>
                    <td className="text-slate-600">{v.screened} patients</td>
                    <td>
                      <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="primary-button">
            Close Coverage Details
          </button>
        </div>
      </div>
    </div>
  )
}

function ReferralsView({
  referrals,
  onUpdateReferrals,
  onStartScreening,
  onOpenNewReferral,
}: {
  referrals: Referral[]
  onUpdateReferrals: () => void
  onStartScreening: (p?: Patient) => void
  onOpenNewReferral: () => void
}) {
  return (
    <div className="referral-list">
      {referrals.length > 0 ? (
        referrals.map((r) => (
          <div className="referral-row" key={r.id}>
            <div className="patient-avatar">
              {r.patientName
                ? r.patientName
                    .split(' ')
                    .map((v) => v[0])
                    .join('')
                : 'PT'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <strong>{r.patientName}</strong>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({r.patientId}) · Ref ID: {r.id}
                </span>
              </div>
              <p className="text-slate-600 text-xs mt-0.5">
                {r.reason} ·{' '}
                <span className="text-slate-700 font-semibold">
                  {r.destination}
                </span>
              </p>
              <div className="text-[10px] text-slate-400 mt-1">
                Created:{' '}
                {new Date(r.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
            <RiskBadge
              risk={
                r.priority === 'High'
                  ? 'High'
                  : r.priority === 'Moderate'
                  ? 'Moderate'
                  : 'Low'
              }
            />
            <div className="flex items-center gap-2">
              <select
                value={r.status}
                onChange={(e) => {
                  patientStorageService.updateReferralStatus(
                    r.id,
                    e.target.value as any
                  )
                  onUpdateReferrals()
                }}
                className="text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-semibold text-slate-700 cursor-pointer shadow-sm hover:border-primary"
              >
                <option value="Pending Review">Pending Review</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs">
          No referrals recorded in the database. Click &quot;Create Referral&quot; to initiate a clinical referral.
        </div>
      )}
    </div>
  )
}

/**
 * Interactive Patient Profile Modal
 * Supports: Viewing profile, editing patient data, viewing past screening assessments,
 * and launching new screenings for this patient.
 */
function PatientProfileModal({
  patient,
  screenings,
  onClose,
  onSave,
  onStartScreening,
  onViewScreeningDetails,
}: {
  patient: Patient
  screenings: ScreeningRecord[]
  onClose: () => void
  onSave: (updated: Patient) => void
  onStartScreening: (p: Patient) => void
  onViewScreeningDetails: (s: ScreeningRecord) => void
}) {
  const [formData, setFormData] = useState<Patient>({ ...patient })
  const [savedSuccess, setSavedSuccess] = useState(false)
  const patientScreenings = screenings.filter(
    (s) => s.patientId === patient.patientId || s.patientId === patient.id
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-3xl">
        <div className="modal-top">
          <div className="flex items-center gap-3">
            <div className="patient-avatar text-base w-10 h-10">
              {formData.name
                ? formData.name
                    .split(' ')
                    .map((x) => x[0])
                    .join('')
                : 'PT'}
            </div>
            <div>
              <div className="eyebrow text-primary">PATIENT PROFILE</div>
              <h2>{formData.name || 'Unnamed Patient'}</h2>
              <p className="text-xs text-slate-500">
                {formData.patientId || formData.id} · {formData.age} yrs ·{' '}
                {formData.gender} · {formData.village}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-md text-xs font-semibold flex items-center gap-2">
            <Check size={16} /> Patient information updated and persisted successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Demographics & Contact Information
            </h3>
            <div className="form-grid">
              <label>
                Full Name
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Patient ID
                <input
                  value={formData.patientId || formData.id}
                  disabled
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </label>
              <label>
                Age
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: Number(e.target.value) })
                  }
                  required
                />
              </label>
              <label>
                Gender
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value as any })
                  }
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Village / Sub-centre
                <input
                  value={formData.village}
                  onChange={(e) =>
                    setFormData({ ...formData, village: e.target.value })
                  }
                  placeholder="e.g. Sinnar, Niphad, Yeola"
                  required
                />
              </label>
              <label>
                Phone Number
                <input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91 98231 00000"
                  required
                />
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Clinical & Diabetes Profile
            </h3>
            <div className="form-grid">
              <label>
                Diabetes Duration
                <input
                  value={formData.diabetesDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      diabetesDuration: e.target.value,
                    })
                  }
                  placeholder="e.g. 5 years (Since 2019)"
                />
              </label>
              <label>
                Latest HbA1c (%)
                <input
                  value={formData.hba1c}
                  onChange={(e) =>
                    setFormData({ ...formData, hba1c: e.target.value })
                  }
                  placeholder="e.g. 7.8%"
                />
              </label>
              <label>
                Previous Eye Exam
                <select
                  value={formData.previousEyeExam || 'Never'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      previousEyeExam: e.target.value as any,
                    })
                  }
                >
                  <option value="Never">Never</option>
                  <option value="< 6 months">&lt; 6 months</option>
                  <option value="6-12 months">6-12 months</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="> 2 years">&gt; 2 years</option>
                </select>
              </label>
              <label>
                Known Diabetic Retinopathy
                <select
                  value={formData.knownDiabeticRetinopathy || 'No'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      knownDiabeticRetinopathy: e.target.value as any,
                    })
                  }
                >
                  <option value="No">No prior diagnosis</option>
                  <option value="Yes - Mild">Yes - Mild non-proliferative</option>
                  <option value="Yes - Moderate">
                    Yes - Moderate non-proliferative
                  </option>
                  <option value="Yes - Laser treated">Yes - Laser treated</option>
                  <option value="Unsure">Unsure / Unknown</option>
                </select>
              </label>
              <div className="col-span-full">
                <label>
                  Reported Symptoms (comma-separated)
                  <input
                    value={(formData.symptoms || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        symptoms: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g. Blurred vision, Night glare, Floaters"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" className="primary-button">
              Save Patient Information
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Past Screening Assessments
              </h3>
              <p className="text-xs text-slate-500">
                Historical AI evaluations conducted for this patient
              </p>
            </div>
            <Button
              type="button"
              onClick={() => onStartScreening(formData)}
              className="primary-button small"
            >
              <Plus size={14} /> Start New Screening
            </Button>
          </div>

          {patientScreenings.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Screening ID</th>
                    <th>Date</th>
                    <th>Risk</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {patientScreenings.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs text-slate-700">
                        {s.id}
                      </td>
                      <td className="text-slate-500">{s.date || 'Recorded'}</td>
                      <td>
                        <RiskBadge risk={s.aiResult?.riskLevel || 'Moderate'} />
                      </td>
                      <td className="text-xs text-slate-600">
                        {s.severityLabel ||
                          s.aiResult?.severityLabel ||
                          'Screening complete'}
                      </td>
                      <td className="text-xs font-semibold text-slate-700">
                        {Math.round(s.confidence * 100)}%
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onViewScreeningDetails(s)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
              No prior screenings recorded for this patient. Click &quot;Start New Screening&quot; to begin.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="secondary-button">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Screening Details Inspection Modal
 * Displays complete persisted data of a screening: fundus image preview,
 * diagnostic severity, model confidence, image quality assessment,
 * detected findings, clinical explanation, and referral recommendation.
 */
function ScreeningDetailsModal({
  screening,
  onClose,
  onExplain,
}: {
  screening: ScreeningRecord
  onClose: () => void
  onExplain: (res?: AIScreeningResult, img?: string | null) => void
}) {
  const imageSrc = screening.rightEyeImage || screening.leftEyeImage || null
  const risk =
    screening.aiResult?.riskLevel ||
    (screening.severity === 'severe'
      ? 'High'
      : screening.severity === 'moderate'
      ? 'Moderate'
      : 'Low')

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-2xl">
        <div className="modal-top">
          <div>
            <div className="eyebrow text-primary">
              SCREENING ASSESSMENT DETAILS
            </div>
            <h2>{screening.patientName}</h2>
            <p className="text-xs text-slate-500">
              {screening.patientId} · {screening.id} ·{' '}
              {screening.date || 'Recorded'} · Model: {screening.modelVersion}
            </p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Severity Banner */}
        <div
          className={`result-banner mt-4 ${
            risk === 'High'
              ? 'border-rose-300 bg-rose-50/70'
              : risk === 'Low'
              ? 'border-teal-300 bg-teal-50/70'
              : ''
          }`}
        >
          <div
            className={`result-icon ${
              risk === 'High'
                ? 'text-rose-700 bg-rose-100'
                : risk === 'Low'
                ? 'text-teal-700 bg-teal-100'
                : ''
            }`}
          >
            {risk === 'Low' ? <Check size={23} /> : <AlertTriangle size={23} />}
          </div>
          <div>
            <span
              className={`eyebrow ${
                risk === 'High'
                  ? 'text-rose-700'
                  : risk === 'Low'
                  ? 'text-teal-700'
                  : 'text-amber-700'
              }`}
            >
              {risk.toUpperCase()} RISK DETECTED
            </span>
            <h3>
              {screening.severityLabel || screening.aiResult?.severityLabel}
            </h3>
            <p className="text-xs text-slate-600">
              {screening.recommendation?.details ||
                screening.aiResult?.recommendationDetails}
            </p>
          </div>
          <strong>{Math.round(screening.confidence * 100)}%</strong>
        </div>

        {/* Images & Summary */}
        <div className="result-images mt-4">
          <RetinalImage
            heatmap
            imageSrc={imageSrc}
            hotspots={screening.aiResult?.heatmapHotspots}
          />
          <div className="result-summary">
            <div
              className="confidence-ring"
              style={{
                background: `conic-gradient(#d99a2b 0 ${Math.round(
                  screening.confidence * 100
                )}%, #f2e8d1 ${Math.round(screening.confidence * 100)}%)`,
              }}
            >
              <span>
                {Math.round(screening.confidence * 100)}
                <small>%</small>
              </span>
            </div>
            <div>
              <strong>Diagnostic Quality</strong>
              <p className="text-xs text-slate-600 mt-1">
                Quality: {Math.round(screening.imageQuality * 100)}% ·{' '}
                {screening.imageQuality >= 0.8 ? 'Optimal' : 'Adequate'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {screening.explanation?.summary ||
                  screening.aiResult?.clinicalReviewNote}
              </p>
            </div>

            <div className="result-reasons">
              {screening.findings && screening.findings.length > 0 ? (
                screening.findings.map((f: any, i: number) => (
                  <span key={i}>
                    <i />
                    <strong className="capitalize">
                      {f.type?.replace('_', ' ')}:
                    </strong>{' '}
                    {f.description || f.type} (
                    {Math.round((f.confidence || 0.85) * 100)}%)
                  </span>
                ))
              ) : (
                <span>
                  <i className="teal-dot" />
                  No microaneurysms, hemorrhages or macular lesions detected.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Referral Status Block */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-700">Referral Status: </span>
            <span className="font-medium text-slate-900">
              {screening.referralStatus}
            </span>
            {screening.aiResult?.referralFacility && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Facility: {screening.aiResult.referralFacility} (
                {screening.aiResult.referralUrgency})
              </p>
            )}
          </div>
          <RiskBadge risk={risk} />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={() => onExplain(screening.aiResult, imageSrc)}
            className="secondary-button"
          >
            <Info size={16} /> Open Explainable AI Heatmap
          </button>
          <button type="button" onClick={onClose} className="primary-button">
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal to Register a New Patient
 */
function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (p: Patient) => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState(48)
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female')
  const [village, setVillage] = useState('Sinnar')
  const [phone, setPhone] = useState('+91 ')
  const [diabetesDuration, setDiabetesDuration] = useState('4 years')
  const [hba1c, setHba1c] = useState('7.2%')
  const [previousEyeExam, setPreviousEyeExam] = useState<
    'Never' | '< 6 months' | '6-12 months' | '1-2 years' | '> 2 years'
  >('1-2 years')
  const [knownDiabeticRetinopathy, setKnownDiabeticRetinopathy] = useState<
    'No' | 'Yes - Mild' | 'Yes - Moderate' | 'Yes - Laser treated' | 'Unsure'
  >('No')
  const [symptoms, setSymptoms] = useState('Mild blurred vision')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const newId = patientStorageService.generateNewPatientId()
    const p = patientStorageService.createPatient({
      patientId: newId,
      name: name.trim(),
      age,
      gender,
      village: village.trim(),
      phone: phone.trim(),
      diabetesDuration,
      hba1c,
      previousEyeExam,
      knownDiabeticRetinopathy,
      symptoms: symptoms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      lastRisk: 'Low',
      lastStatus: 'Registered',
    })
    onCreated(p)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-2xl">
        <div className="modal-top">
          <div>
            <div className="eyebrow text-primary">NEW PATIENT REGISTRATION</div>
            <h2>Register New Community Patient</h2>
            <p className="text-xs text-slate-500">
              Record demographic and clinical information into the persistent database
            </p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="form-grid">
            <label>
              Full Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shakuntala Shinde"
                required
              />
            </label>
            <label>
              Age
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
              />
            </label>
            <label>
              Gender
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Village / Sub-centre
              <input
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Sinnar, Niphad, Dindori"
                required
              />
            </label>
            <label>
              Phone Number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98231 00000"
                required
              />
            </label>
            <label>
              Diabetes Duration
              <input
                value={diabetesDuration}
                onChange={(e) => setDiabetesDuration(e.target.value)}
                placeholder="e.g. 5 years"
              />
            </label>
            <label>
              Latest HbA1c (%)
              <input
                value={hba1c}
                onChange={(e) => setHba1c(e.target.value)}
                placeholder="e.g. 7.5%"
              />
            </label>
            <label>
              Previous Eye Exam
              <select
                value={previousEyeExam}
                onChange={(e) => setPreviousEyeExam(e.target.value as any)}
              >
                <option value="Never">Never</option>
                <option value="< 6 months">&lt; 6 months</option>
                <option value="6-12 months">6-12 months</option>
                <option value="1-2 years">1-2 years</option>
                <option value="> 2 years">&gt; 2 years</option>
              </select>
            </label>
            <label>
              Known Diabetic Retinopathy
              <select
                value={knownDiabeticRetinopathy}
                onChange={(e) =>
                  setKnownDiabeticRetinopathy(e.target.value as any)
                }
              >
                <option value="No">No prior diagnosis</option>
                <option value="Yes - Mild">Yes - Mild</option>
                <option value="Yes - Moderate">Yes - Moderate</option>
                <option value="Yes - Laser treated">Yes - Laser treated</option>
                <option value="Unsure">Unsure / Unknown</option>
              </select>
            </label>
            <div className="col-span-full">
              <label>
                Reported Symptoms
                <input
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Blurred vision, Floaters"
                />
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              Cancel
            </button>
            <Button type="submit" className="primary-button">
              <Check size={16} /> Register Patient
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Modal to Create a New Referral
 */
function NewReferralModal({
  patients,
  screenings,
  onClose,
  onCreated,
}: {
  patients: Patient[]
  screenings: ScreeningRecord[]
  onClose: () => void
  onCreated: () => void
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(
    patients[0]?.patientId || patients[0]?.id || ''
  )
  const [priority, setPriority] = useState<'High' | 'Moderate' | 'Low'>('High')
  const [destination, setDestination] = useState(
    'District Hospital Eye OPD, Nashik'
  )
  const [reason, setReason] = useState(
    'Suspected diabetic retinopathy requiring specialist ophthalmic evaluation'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = patients.find(
      (pt) => pt.patientId === selectedPatientId || pt.id === selectedPatientId
    )
    const matchingScreening = screenings.find(
      (s) => s.patientId === selectedPatientId
    )

    patientStorageService.createReferral({
      screeningId: matchingScreening?.id || `scr_manual_${Date.now()}`,
      patientId: selectedPatientId,
      patientName: p?.name || 'Patient',
      priority,
      reason,
      destination,
      status: 'Pending Review',
    })
    onCreated()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-lg">
        <div className="modal-top">
          <div>
            <div className="eyebrow text-primary">CLINICAL REFERRAL</div>
            <h2>Create Patient Referral</h2>
            <p className="text-xs text-slate-500">
              Initiate a formal referral to secondary or tertiary eye care
            </p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3 text-xs">
            <label className="block font-bold text-slate-700">
              Select Patient
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="mt-1 w-full h-10 border border-input rounded-md px-3 text-xs bg-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.patientId || p.id}>
                    {p.name} ({p.patientId || p.id}) · {p.village}
                  </option>
                ))}
              </select>
            </label>

            <label className="block font-bold text-slate-700">
              Referral Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="mt-1 w-full h-10 border border-input rounded-md px-3 text-xs bg-white"
              >
                <option value="High">
                  High - Urgent Specialist Care (24-48 hrs)
                </option>
                <option value="Moderate">
                  Moderate - Clinical Review (Within 7-14 days)
                </option>
                <option value="Low">
                  Low - Routine Monitoring (Within 30 days)
                </option>
              </select>
            </label>

            <label className="block font-bold text-slate-700">
              Destination Facility
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-1 w-full h-10 border border-input rounded-md px-3 text-xs bg-white"
              >
                <option value="District Hospital Eye OPD, Nashik">
                  District Hospital Eye OPD, Nashik
                </option>
                <option value="PHC Sinnar">
                  PHC Sinnar Ophthalmology Unit
                </option>
                <option value="Ophthalmology camp · 28 Sep">
                  Community Ophthalmology Camp (28 Sep)
                </option>
                <option value="Civil Hospital Vitreo-Retinal Unit, Nashik">
                  Civil Hospital Vitreo-Retinal Unit, Nashik
                </option>
              </select>
            </label>

            <label className="block font-bold text-slate-700">
              Clinical Reason / Indication
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full border border-input rounded-md p-2 text-xs bg-white"
                required
              />
            </label>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
            >
              Cancel
            </button>
            <Button type="submit" className="primary-button">
              Create Referral
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Complete 9-stage Functional Screening Modal
 */
function ScreeningModal({
  step,
  setStep,
  patient,
  setPatient,
  patientsList,
  onUpdatePatientsList,
  activeResult,
  setActiveResult,
  images,
  setImages,
  onClose,
  onExplain,
}: {
  step: number
  setStep: (n: number) => void
  patient: Patient
  setPatient: (p: Patient) => void
  patientsList: Patient[]
  onUpdatePatientsList: () => void
  activeResult: AIScreeningResult | null
  setActiveResult: (r: AIScreeningResult | null) => void
  images: { rightEye?: string | null; leftEye?: string | null }
  setImages: React.Dispatch<
    React.SetStateAction<{ rightEye?: string | null; leftEye?: string | null }>
  >
  onClose: () => void
  onExplain: () => void
}) {
  // Mode: Select existing patient vs Create new patient
  const [patientMode, setPatientMode] = useState<'existing' | 'create'>('existing')

  // Retinal image file & quality states
  const [rightQuality, setRightQuality] = useState<ImageQualityMetrics | null>(null)
  const [leftQuality, setLeftQuality] = useState<ImageQualityMetrics | null>(null)
  const [rightError, setRightError] = useState<string | null>(null)
  const [leftError, setLeftError] = useState<string | null>(null)

  // AI Analysis states
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStage, setCurrentStage] = useState<StageInfo>(ANALYSIS_STAGES[0])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Test simulation preset (allows testing all 5 grades: No DR, Mild, Moderate, Severe, Proliferative)
  const [selectedGradePreset, setSelectedGradePreset] = useState<DRGrade>('moderate')
  const [simulatedErrorType, setSimulatedErrorType] = useState<
    'none' | 'invalid_image' | 'low_quality' | 'timeout' | 'unavailable' | 'failure'
  >('none')

  // Hidden file inputs
  const rightInputRef = useRef<HTMLInputElement>(null)
  const leftInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [activeEyeForCamera, setActiveEyeForCamera] = useState<'OD' | 'OS'>('OD')

  const sampleImages = getSampleRetinalImages()

  // Load sample image helper
  const handleLoadSample = (sample: SampleRetinalImage, targetEye: 'OD' | 'OS') => {
    if (targetEye === 'OD') {
      setImages((prev) => ({ ...prev, rightEye: sample.dataUrl }))
      setRightError(null)
      if (sample.presetGrade === 'poor_quality') {
        setRightQuality({
          qualityScore: 0.38,
          focus: 'Poor',
          brightness: 'Underexposed',
          fieldOfView: 'Inadequate',
          isAcceptable: false,
          message: 'Image quality is insufficient for reliable screening.',
        })
      } else {
        setRightQuality({
          qualityScore: 0.94,
          focus: 'Optimal',
          brightness: 'Optimal',
          fieldOfView: 'Optimal',
          isAcceptable: true,
          message: 'Fundus photograph is clear with optimal vascular clarity.',
        })
      }
    } else {
      setImages((prev) => ({ ...prev, leftEye: sample.dataUrl }))
      setLeftError(null)
      if (sample.presetGrade === 'poor_quality') {
        setLeftQuality({
          qualityScore: 0.38,
          focus: 'Poor',
          brightness: 'Underexposed',
          fieldOfView: 'Inadequate',
          isAcceptable: false,
          message: 'Image quality is insufficient for reliable screening.',
        })
      } else {
        setLeftQuality({
          qualityScore: 0.91,
          focus: 'Optimal',
          brightness: 'Adequate',
          fieldOfView: 'Optimal',
          isAcceptable: true,
          message: 'Fundus photograph is clear with optimal vascular clarity.',
        })
      }
    }
  }

  // Handle real file upload & quality validation with automatic compression
  const processUploadedFile = async (file: File, eye: 'OD' | 'OS') => {
    const res = await validateRetinalFile(file)
    if (!res.valid) {
      if (eye === 'OD') {
        setRightError(res.error || 'Invalid image file.')
      } else {
        setLeftError(res.error || 'Invalid image file.')
      }
      return
    }

    try {
      // Compress and optimize image to diagnostic resolution (prevents LocalStorage quota saturation)
      const compressedDataUrl = await compressRetinalImage(file, 1024, 0.85)
      if (eye === 'OD') {
        setImages((prev) => ({ ...prev, rightEye: compressedDataUrl }))
        setRightQuality(res.quality || null)
        setRightError(null)
      } else {
        setImages((prev) => ({ ...prev, leftEye: compressedDataUrl }))
        setLeftQuality(res.quality || null)
        setLeftError(null)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        if (eye === 'OD') {
          setImages((prev) => ({ ...prev, rightEye: dataUrl }))
          setRightQuality(res.quality || null)
          setRightError(null)
        } else {
          setImages((prev) => ({ ...prev, leftEye: dataUrl }))
          setLeftQuality(res.quality || null)
          setLeftError(null)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent, eye: 'OD' | 'OS') => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0], eye)
    }
  }

  // Camera trigger
  const triggerCamera = (eye: 'OD' | 'OS') => {
    setActiveEyeForCamera(eye)
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  // Run AI Analysis through async staged pipeline
  const runAnalysis = async () => {
    // Check quality before running analysis
    const rightPoor = rightQuality && !rightQuality.isAcceptable
    const leftPoor = leftQuality && !leftQuality.isAcceptable
    if (rightPoor || leftPoor) {
      alert(
        'Image quality is insufficient for reliable screening. Please retake or upload another image.'
      )
      return
    }

    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisProgress(10)
    setCurrentStage(ANALYSIS_STAGES[0])

    try {
      const result = await aiScreeningService.analyze(
        images,
        {
          patientId: patient.id,
          eye: images.rightEye ? 'OD' : 'OS',
          presetGrade: selectedGradePreset,
          forcedQuality: rightQuality || leftQuality || undefined,
          simulateError: simulatedErrorType !== 'none' ? simulatedErrorType : undefined,
        },
        (stage, percent) => {
          setCurrentStage(stage)
          setAnalysisProgress(percent)
        }
      )

      setActiveResult(result)
      setAnalyzing(false)
      setStep(3)
    } catch (err: any) {
      setAnalyzing(false)
      setAnalysisError(err.message || 'Error occurred during AI analysis pipeline.')
    }
  }

  // Save screening to local database
  const handleSaveScreening = () => {
    if (!activeResult) return

    const newRecord: ScreeningRecord = {
      id: `SCR-${Date.now().toString().slice(-6)}`,
      patientId: patient.patientId || patient.id,
      patientName: patient.name,
      leftEyeImage: images.leftEye || null,
      rightEyeImage: images.rightEye || null,
      severity: activeResult.severity,
      severityLabel: activeResult.severityLabel,
      confidence: activeResult.confidence,
      imageQuality: activeResult.imageQuality,
      findings: activeResult.findings,
      explanation: { summary: activeResult.clinicalReviewNote, method: 'Grad-CAM' },
      recommendation: {
        action: activeResult.recommendation,
        label: activeResult.recommendationLabel,
        details: activeResult.recommendationDetails,
      },
      referralStatus: activeResult.referralRequired ? 'Pending Review' : 'None',
      modelVersion: 'DrishtiAI-Retina-v1.0',
      createdAt: new Date().toISOString(),
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aiResult: activeResult,
      referralCreated: activeResult.referralRequired,
    }

    patientStorageService.saveScreening(newRecord)
    patientStorageService.savePatient({
      ...patient,
      lastScreened: 'Just now',
      lastRisk: activeResult.riskLevel,
      lastStatus: activeResult.referralRequired
        ? 'Review recommended'
        : 'No signs detected',
    })

    setSaved(true)
    onUpdatePatientsList()
  }

  // Check if current image is poor
  const hasPoorImage = Boolean(
    (rightQuality && !rightQuality.isAcceptable) ||
    (leftQuality && !leftQuality.isAcceptable)
  )

  return (
    <div className="modal-backdrop">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={rightInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], 'OD')
          }
        }}
      />
      <input
        type="file"
        ref={leftInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], 'OS')
          }
        }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], activeEyeForCamera)
          }
        }}
      />

      <div className="modal screening-modal">
        {/* Modal Top */}
        <div className="modal-top">
          <div>
            <span className="eyebrow text-primary">
              NEW SCREENING · {patient.id || 'DR-24082'}
            </span>
            <h2>
              {step === 3
                ? 'AI screening result'
                : step === 2
                ? 'Capture & assess retinal images'
                : 'Patient selection & details'}
            </h2>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={19} />
          </button>
        </div>

        {/* Modal Progress Indicator */}
        <div className="modal-progress">
          <span className={step >= 1 ? 'done' : ''}>1</span>
          <i className={step > 1 ? 'done' : ''} />
          <span className={step >= 2 ? 'done' : ''}>2</span>
          <i className={step > 2 ? 'done' : ''} />
          <span className={step >= 3 ? 'done' : ''}>3</span>
        </div>

        {/* STEP 1: PATIENT SELECTION & INFORMATION */}
        {step === 1 && (
          <div>
            <div className="patient-tabs">
              <button
                type="button"
                className={`patient-tab ${
                  patientMode === 'existing' ? 'active' : ''
                }`}
                onClick={() => setPatientMode('existing')}
              >
                Select Existing Patient
              </button>
              <button
                type="button"
                className={`patient-tab ${
                  patientMode === 'create' ? 'active' : ''
                }`}
                onClick={() => {
                  setPatientMode('create')
                  const newId = patientStorageService.generateNewPatientId()
                  setPatient({
                    id: newId,
                    patientId: newId,
                    name: '',
                    age: 45,
                    gender: 'Female',
                    village: 'Nashik',
                    phone: '',
                    diabetesDuration: '3 years',
                    hba1c: '7.0%',
                    previousEyeExam: 'Never',
                    knownDiabeticRetinopathy: 'No',
                    symptoms: ['None'],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }}
              >
                + Register New Patient
              </button>
            </div>

            {patientMode === 'existing' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Choose patient from registry
                </label>
                <select
                  value={patient.id}
                  onChange={(e) => {
                    const selected = patientsList.find(
                      (p) => p.id === e.target.value
                    )
                    if (selected) setPatient(selected)
                  }}
                  className="w-full h-10 border border-input rounded-md px-3 text-xs bg-white"
                >
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) · {p.age} yrs · {p.village}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-grid">
              <label>
                Patient ID
                <input
                  value={patient.id}
                  onChange={(e) =>
                    setPatient({ ...patient, id: e.target.value })
                  }
                  placeholder="e.g. DR-24082"
                />
              </label>
              <label>
                Patient full name
                <input
                  value={patient.name}
                  onChange={(e) =>
                    setPatient({ ...patient, name: e.target.value })
                  }
                  placeholder="Enter full name"
                />
              </label>
              <label>
                Age
                <input
                  type="number"
                  value={patient.age}
                  onChange={(e) =>
                    setPatient({
                      ...patient,
                      age: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="Years"
                />
              </label>
              <label>
                Gender
                <select
                  value={patient.gender}
                  onChange={(e) =>
                    setPatient({
                      ...patient,
                      gender: e.target.value as Patient['gender'],
                    })
                  }
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Village / location
                <input
                  value={patient.village}
                  onChange={(e) =>
                    setPatient({ ...patient, village: e.target.value })
                  }
                  placeholder="Village or Town"
                />
              </label>
              <label>
                Phone number
                <input
                  value={patient.phone}
                  onChange={(e) =>
                    setPatient({ ...patient, phone: e.target.value })
                  }
                  placeholder="+91 98XXX XXXXX"
                />
              </label>
              <label>
                Diabetes duration
                <input
                  value={patient.diabetesDuration}
                  onChange={(e) =>
                    setPatient({
                      ...patient,
                      diabetesDuration: e.target.value,
                    })
                  }
                  placeholder="e.g. 7 years (Since 2017)"
                />
              </label>
              <label>
                HbA1c level (%)
                <input
                  value={patient.hba1c}
                  onChange={(e) =>
                    setPatient({ ...patient, hba1c: e.target.value })
                  }
                  placeholder="e.g. 8.4%"
                />
              </label>
              <label>
                Previous eye examination
                <select
                  value={patient.previousEyeExam}
                  onChange={(e) =>
                    setPatient({
                      ...patient,
                      previousEyeExam: e.target.value as Patient['previousEyeExam'],
                    })
                  }
                >
                  <option value="Never">Never</option>
                  <option value="< 6 months">&lt; 6 months ago</option>
                  <option value="6-12 months">6-12 months ago</option>
                  <option value="1-2 years">1-2 years ago</option>
                  <option value="> 2 years">&gt; 2 years ago</option>
                </select>
              </label>
              <label>
                Known diabetic retinopathy
                <select
                  value={patient.knownDiabeticRetinopathy}
                  onChange={(e) =>
                    setPatient({
                      ...patient,
                      knownDiabeticRetinopathy: e.target.value as Patient['knownDiabeticRetinopathy'],
                    })
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes - Mild">Yes - Mild</option>
                  <option value="Yes - Moderate">Yes - Moderate</option>
                  <option value="Yes - Laser treated">Yes - Laser treated</option>
                  <option value="Unsure">Unsure / Unknown</option>
                </select>
              </label>
              <div className="col-span-full">
                <label>
                  Reported symptoms
                  <input
                    value={(patient.symptoms || []).join(', ')}
                    onChange={(e) =>
                      setPatient({
                        ...patient,
                        symptoms: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g. Blurred vision, Floaters, Night glare, Eye strain"
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={onClose} className="secondary-button">
                Cancel
              </button>
              <Button
                onClick={() => {
                  if (!patient.name.trim()) {
                    alert('Please enter patient name.')
                    return
                  }
                  patientStorageService.savePatient(patient)
                  onUpdatePatientsList()
                  setStep(2)
                }}
                className="primary-button"
              >
                Continue to Retinal Images <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: RETINAL IMAGE UPLOAD & QUALITY ASSESSMENT */}
        {step === 2 && !analyzing && (
          <div>
            <p className="text-sm leading-6 text-slate-500">
              Position the fundus camera or upload retinal images for both eyes.
              Drag and drop, upload files, or use mobile camera capture. DrishtiAI
              automatically validates file type, size, dimensions, and diagnostic
              illumination.
            </p>

            {/* Quick Sample Selector for Field Testing */}
            <div className="sample-picker">
              <span className="text-[11px] font-bold text-slate-400 py-1">
                Quick Test Samples:
              </span>
              <button
                type="button"
                className="sample-pill"
                onClick={() => handleLoadSample(sampleImages[0], 'OD')}
              >
                <Check size={13} className="text-teal-600" />
                Normal Fundus (OD)
              </button>
              <button
                type="button"
                className="sample-pill"
                onClick={() => handleLoadSample(sampleImages[1], 'OS')}
              >
                <Check size={13} className="text-amber-600" />
                Moderate DR (OS)
              </button>
              <button
                type="button"
                className="sample-pill"
                onClick={() => handleLoadSample(sampleImages[2], 'OD')}
              >
                <AlertTriangle size={13} className="text-rose-600" />
                Poor Quality Test (Triggers Rejection)
              </button>
            </div>

            {/* Eye Capture Grid */}
            <div className="eye-capture-grid">
              {/* Right Eye (OD) */}
              <div
                className={`capture-card ${!images.rightEye ? 'empty' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'OD')}
              >
                {images.rightEye ? (
                  <div>
                    <RetinalImage
                      compact
                      imageSrc={images.rightEye}
                      label="OD · RIGHT EYE"
                    />
                    <div className="capture-status">
                      <Check size={15} /> Right eye captured
                    </div>
                    {/* Quality Assessment Metrics for Right Eye */}
                    <div
                      className={`quality-box ${
                        rightQuality && !rightQuality.isAcceptable ? 'poor' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">Image Quality</span>
                        <span
                          className={
                            rightQuality && !rightQuality.isAcceptable
                              ? 'text-rose-600'
                              : 'text-teal-700'
                          }
                        >
                          {rightQuality
                            ? `${Math.round(rightQuality.qualityScore * 100)}% · ${
                                rightQuality.isAcceptable
                                  ? 'Acceptable'
                                  : 'Insufficient'
                              }`
                            : '92% · Optimal'}
                        </span>
                      </div>
                      <div className="quality-grid">
                        <div className="quality-metric">
                          <span>Focus</span>
                          <strong>{rightQuality?.focus || 'Optimal'}</strong>
                        </div>
                        <div className="quality-metric">
                          <span>Brightness</span>
                          <strong>
                            {rightQuality?.brightness || 'Adequate'}
                          </strong>
                        </div>
                        <div className="quality-metric">
                          <span>FOV</span>
                          <strong>
                            {rightQuality?.fieldOfView || 'Optimal'}
                          </strong>
                        </div>
                        <div className="quality-metric">
                          <span>Min Res</span>
                          <strong>Passed</strong>
                        </div>
                      </div>

                      {rightQuality && !rightQuality.isAcceptable && (
                        <div className="quality-alert-banner">
                          <AlertTriangle size={16} />
                          <span>
                            Image quality is insufficient for reliable screening.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => triggerCamera('OD')}
                        className="secondary-button small flex-1"
                      >
                        <Camera size={14} /> Retake image
                      </button>
                      <button
                        type="button"
                        onClick={() => rightInputRef.current?.click()}
                        className="secondary-button small flex-1"
                      >
                        <Upload size={14} /> Upload another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      className="capture-placeholder cursor-pointer"
                      onClick={() => rightInputRef.current?.click()}
                    >
                      <Upload size={24} />
                      <strong>Right Eye (OD)</strong>
                      <span>Drop file, click to upload, or capture</span>
                    </div>
                    {rightError && (
                      <p className="text-xs text-rose-600 font-medium mt-2">
                        {rightError}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => rightInputRef.current?.click()}
                        className="secondary-button small flex-1"
                      >
                        <Upload size={14} /> Upload file
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerCamera('OD')}
                        className="secondary-button small flex-1"
                      >
                        <Camera size={14} /> Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Left Eye (OS) */}
              <div
                className={`capture-card ${!images.leftEye ? 'empty' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'OS')}
              >
                {images.leftEye ? (
                  <div>
                    <RetinalImage
                      compact
                      imageSrc={images.leftEye}
                      label="OS · LEFT EYE"
                    />
                    <div className="capture-status">
                      <Check size={15} /> Left eye captured
                    </div>
                    {/* Quality Assessment Metrics for Left Eye */}
                    <div
                      className={`quality-box ${
                        leftQuality && !leftQuality.isAcceptable ? 'poor' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">Image Quality</span>
                        <span
                          className={
                            leftQuality && !leftQuality.isAcceptable
                              ? 'text-rose-600'
                              : 'text-teal-700'
                          }
                        >
                          {leftQuality
                            ? `${Math.round(leftQuality.qualityScore * 100)}% · ${
                                leftQuality.isAcceptable
                                  ? 'Acceptable'
                                  : 'Insufficient'
                              }`
                            : '91% · Optimal'}
                        </span>
                      </div>
                      <div className="quality-grid">
                        <div className="quality-metric">
                          <span>Focus</span>
                          <strong>{leftQuality?.focus || 'Optimal'}</strong>
                        </div>
                        <div className="quality-metric">
                          <span>Brightness</span>
                          <strong>
                            {leftQuality?.brightness || 'Adequate'}
                          </strong>
                        </div>
                        <div className="quality-metric">
                          <span>FOV</span>
                          <strong>
                            {leftQuality?.fieldOfView || 'Optimal'}
                          </strong>
                        </div>
                        <div className="quality-metric">
                          <span>Min Res</span>
                          <strong>Passed</strong>
                        </div>
                      </div>

                      {leftQuality && !leftQuality.isAcceptable && (
                        <div className="quality-alert-banner">
                          <AlertTriangle size={16} />
                          <span>
                            Image quality is insufficient for reliable screening.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => triggerCamera('OS')}
                        className="secondary-button small flex-1"
                      >
                        <Camera size={14} /> Retake image
                      </button>
                      <button
                        type="button"
                        onClick={() => leftInputRef.current?.click()}
                        className="secondary-button small flex-1"
                      >
                        <Upload size={14} /> Upload another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      className="capture-placeholder cursor-pointer"
                      onClick={() => leftInputRef.current?.click()}
                    >
                      <Upload size={24} />
                      <strong>Left Eye (OS)</strong>
                      <span>Drop file, click to upload, or capture</span>
                    </div>
                    {leftError && (
                      <p className="text-xs text-rose-600 font-medium mt-2">
                        {leftError}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => leftInputRef.current?.click()}
                        className="secondary-button small flex-1"
                      >
                        <Upload size={14} /> Upload file
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerCamera('OS')}
                        className="secondary-button small flex-1"
                      >
                        <Camera size={14} /> Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {analysisError && (
              <div className="quality-alert-banner mt-3 mb-2 bg-rose-50 border-rose-200 text-rose-800">
                <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                <span className="flex-1">{analysisError}</span>
              </div>
            )}

            {/* AI Grading Model Simulation Selector for Developer & Clinical Review */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">
                  Simulation Target:
                </span>
                <select
                  value={selectedGradePreset}
                  onChange={(e) => setSelectedGradePreset(e.target.value as DRGrade)}
                  className="h-8 border border-input rounded px-2 text-xs bg-white text-slate-700"
                >
                  <option value="no_dr">No DR (Low Risk)</option>
                  <option value="mild">Mild DR (Early NPDR)</option>
                  <option value="moderate">Moderate DR (Moderate NPDR)</option>
                  <option value="severe">Severe DR (Severe NPDR - 4:2:1)</option>
                  <option value="proliferative">Proliferative DR (High Risk PDR)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Simulate Condition:</span>
                <select
                  value={simulatedErrorType}
                  onChange={(e) => setSimulatedErrorType(e.target.value as any)}
                  className="h-8 border border-input rounded px-2 text-xs bg-white text-slate-700"
                >
                  <option value="none">Normal (Success)</option>
                  <option value="invalid_image">Invalid Image (422)</option>
                  <option value="low_quality">Low Quality Error (422)</option>
                  <option value="timeout">ML Pipeline Timeout (504)</option>
                  <option value="unavailable">ML Service Unavailable (503)</option>
                  <option value="failure">Inference Failure (500)</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setStep(1)} className="secondary-button">
                Back
              </button>
              <Button
                disabled={hasPoorImage}
                onClick={runAnalysis}
                className="primary-button"
              >
                Analyze images <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2.5: AI ANALYSIS IN PROGRESS */}
        {step === 2 && analyzing && (
          <div className="analysis-progress-wrap">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="animate-spin text-primary" size={20} />
                <strong className="text-sm text-slate-800">
                  AI Retinal Pipeline Running...
                </strong>
              </div>
              <span className="text-xs font-bold text-primary">
                {analysisProgress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            {/* Staged Pipeline Tracker */}
            <div className="pipeline-steps">
              {ANALYSIS_STAGES.map((s) => {
                const isPassed = analysisProgress > s.progressPercent
                const isCurrent = currentStage.id === s.id
                return (
                  <div
                    key={s.id}
                    className={`pipeline-step-item ${
                      isCurrent ? 'active' : isPassed ? 'done' : ''
                    }`}
                  >
                    {isPassed ? (
                      <Check size={16} className="text-teal-600" />
                    ) : isCurrent ? (
                      <Activity size={16} className="animate-spin text-primary" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 inline-block" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{s.label}</div>
                      <div className="text-[11px] text-slate-500">
                        {s.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {analysisError && (
              <div className="quality-alert-banner mt-4">
                <AlertTriangle size={16} />
                <span>{analysisError}</span>
                <Button
                  onClick={runAnalysis}
                  className="secondary-button small ml-auto"
                >
                  <RefreshCw size={13} /> Retry
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: AI SCREENING RESULT & REFERRAL */}
        {step === 3 && activeResult && (
          <div>
            {/* Required Clinical Labels */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold tracking-wide uppercase text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-primary" />
                AI-assisted screening result
              </span>
              <span className="font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Clinical review recommended.
              </span>
            </div>

            {/* Result Banner with severity & risk */}
            <div
              className={`result-banner ${
                activeResult.riskLevel === 'High'
                  ? 'border-rose-300 bg-rose-50/70'
                  : activeResult.riskLevel === 'Low'
                  ? 'border-teal-300 bg-teal-50/70'
                  : ''
              }`}
            >
              <div
                className={`result-icon ${
                  activeResult.riskLevel === 'High'
                    ? 'text-rose-700 bg-rose-100'
                    : activeResult.riskLevel === 'Low'
                    ? 'text-teal-700 bg-teal-100'
                    : ''
                }`}
              >
                {activeResult.riskLevel === 'Low' ? (
                  <Check size={23} />
                ) : (
                  <AlertTriangle size={23} />
                )}
              </div>
              <div>
                <span
                  className={`eyebrow ${
                    activeResult.riskLevel === 'High'
                      ? 'text-rose-700'
                      : activeResult.riskLevel === 'Low'
                      ? 'text-teal-700'
                      : 'text-amber-700'
                  }`}
                >
                  {activeResult.riskLevel.toUpperCase()} RISK DETECTED
                </span>
                <h3>{activeResult.severityLabel}</h3>
                <p>{activeResult.recommendationDetails}</p>
              </div>
              <strong>{Math.round(activeResult.confidence * 100)}%</strong>
            </div>

            {/* Result Images & Diagnostic Summary */}
            <div className="result-images">
              <RetinalImage
                heatmap
                imageSrc={images.rightEye || images.leftEye}
                hotspots={activeResult.heatmapHotspots}
              />

              <div className="result-summary">
                <div
                  className="confidence-ring"
                  style={{
                    background: `conic-gradient(#d99a2b 0 ${Math.round(
                      activeResult.confidence * 100
                    )}%, #f2e8d1 ${Math.round(activeResult.confidence * 100)}%)`,
                  }}
                >
                  <span>
                    {Math.round(activeResult.confidence * 100)}
                    <small>%</small>
                  </span>
                </div>
                <div>
                  <strong>Model confidence</strong>
                  <p>{activeResult.clinicalReviewNote}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Image Quality: {Math.round(activeResult.imageQuality * 100)}%
                  </p>
                </div>

                {/* Structured Findings List */}
                <div className="result-reasons">
                  {activeResult.findings.length > 0 ? (
                    activeResult.findings.map((f, i) => (
                      <span key={i}>
                        <i />
                        <strong className="capitalize">{f.type.replace('_', ' ')}:</strong>{' '}
                        {f.description} ({Math.round(f.confidence * 100)}% confidence)
                      </span>
                    ))
                  ) : (
                    <span>
                      <i className="teal-dot" />
                      No microaneurysms, hemorrhages or macular edema detected.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Recommendation Block */}
            {activeResult.referralRequired && (
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Recommended Referral Facility
                  </span>
                  <span className="font-bold text-primary">
                    {activeResult.referralUrgency}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">
                  {activeResult.referralFacility}
                </p>
              </div>
            )}

            <div className="modal-footer">
              <button onClick={onExplain} className="secondary-button">
                <Info size={16} /> Explain this result
              </button>
              <Button onClick={handleSaveScreening} className="primary-button">
                {saved ? (
                  <>
                    <Check size={16} /> Saved to history
                  </>
                ) : (
                  <>Save & create referral <ArrowRight size={16} /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Explainable AI Interactive Explanation Modal
 * Enables healthcare workers to understand WHY the model generated its result.
 * Features:
 * - High-res original fundus image
 * - Grad-CAM attention heatmap overlay
 * - Display controls: Original, Heatmap, Overlay, Side-by-side
 * - Heatmap opacity slider with immediate feedback
 * - Interactive findings: Microaneurysms, Hemorrhages, Exudates, Vessel anomalies
 * - Click-to-highlight finding locations on retinal image
 * - Simple plain-language explanation
 * - Collapsible technical model architecture details
 * - Model confidence & uncertainty guidance
 * - Clinical review disclaimer
 */
function ExplanationModal({
  result,
  imageSrc,
  onClose,
}: {
  result?: AIScreeningResult | null
  imageSrc?: string | null
  onClose: () => void
}) {
  const sampleImages = getSampleRetinalImages()

  // Default fallback findings matching moderate DR
  const defaultModerateFindings: InteractiveFinding[] = [
    {
      id: 'mod_ma',
      type: 'microaneurysm',
      label: 'Microaneurysm-like regions',
      confidence: 0.89,
      location: 'Temporal quadrant',
      markerColor: '#ef4444',
      x: 62,
      y: 54,
      radius: 20,
      explanation: 'Focal dilation of retinal capillaries forming tiny saccular outpouchings visible as pinpoint red lesions.',
      contributionRationale: 'Multiple microaneurysms across sectors indicate breakdown of the inner blood-retina barrier, a critical criterion for moderate DR.'
    },
    {
      id: 'mod_he',
      type: 'hemorrhage',
      label: 'Hemorrhage-like regions',
      confidence: 0.76,
      location: 'Superior nasal arcade',
      markerColor: '#b91c1c',
      x: 32,
      y: 38,
      radius: 24,
      explanation: 'Intraretinal flame and dot/blot hemorrhages arising from ruptured capillary aneurysms.',
      contributionRationale: 'Deep intraretinal hemorrhages reflect progressive capillary ischemic stress and elevate severity classification.'
    },
    {
      id: 'mod_ex',
      type: 'exudate',
      label: 'Exudate-like regions',
      confidence: 0.72,
      location: 'Perimacular temporal fringe',
      markerColor: '#eab308',
      x: 40,
      y: 68,
      radius: 18,
      explanation: 'Yellowish lipid and lipoprotein deposits with distinct margins resulting from persistent plasma leakage.',
      contributionRationale: 'Lipid rings in proximity to the macular arcade warrant ophthalmic monitoring for potential diabetic macular edema.'
    },
    {
      id: 'mod_ves',
      type: 'abnormal_vessels',
      label: 'Abnormal vessel patterns',
      confidence: 0.68,
      location: 'Superior temporal venule',
      markerColor: '#f97316',
      x: 52,
      y: 28,
      radius: 22,
      explanation: 'Focal venous caliber irregularity and localized dilation along the retinal vascular arcades.',
      contributionRationale: 'Venous caliber dilation serves as an established imaging biomarker for downstream tissue hypoxia.'
    }
  ]

  const currentResult = result || {
    severity: 'moderate' as const,
    severityLabel: 'Moderate DR' as const,
    confidence: 0.91,
    riskLevel: 'Moderate' as const,
    imageQuality: 0.92,
    qualityMetrics: {
      qualityScore: 0.92,
      focus: 'Optimal' as const,
      brightness: 'Adequate' as const,
      fieldOfView: 'Optimal' as const,
      isAcceptable: true,
      message: 'Optimal diagnostic image'
    },
    findings: [
      { type: 'microaneurysm', confidence: 0.89 },
      { type: 'hemorrhage', confidence: 0.76 }
    ],
    interactiveFindings: defaultModerateFindings,
    heatmapImageUrl: '',
    recommendation: 'ophthalmologist_review' as const,
    recommendationLabel: 'Ophthalmologist Clinical Review',
    recommendationDetails: 'Moderate non-proliferative diabetic retinopathy detected. Review recommended within 7 days.',
    referralRequired: true,
    referralFacility: 'District Hospital Eye OPD, Nashik',
    referralUrgency: 'Within 7 days' as const,
    clinicalReviewNote: 'Microaneurysms and intraretinal hemorrhages detected in multiple quadrants.',
    heatmapHotspots: [
      { x: 32, y: 38, radius: 24, intensity: 'high' as const, findingType: 'hemorrhage' },
      { x: 62, y: 54, radius: 18, intensity: 'moderate' as const, findingType: 'microaneurysm' },
      { x: 40, y: 68, radius: 15, intensity: 'high' as const, findingType: 'hard_exudate' },
      { x: 52, y: 28, radius: 16, intensity: 'moderate' as const, findingType: 'abnormal_vessels' }
    ],
    analyzedAt: new Date().toISOString()
  }

  const findings = currentResult.interactiveFindings?.length > 0
    ? currentResult.interactiveFindings
    : defaultModerateFindings

  // Image source resolution
  const displayImage = imageSrc || sampleImages[1].dataUrl

  // Grad-CAM heatmap data source (can be real base64 from PyTorch/FastAPI or generated)
  const heatmapDataUrl = useMemo(() => {
    if (currentResult.heatmapImageUrl) return currentResult.heatmapImageUrl
    return generateGradCamHeatmap(currentResult.heatmapHotspots || [])
  }, [currentResult])

  // Heatmap View Controls State
  type DisplayMode = 'original' | 'heatmap' | 'overlay' | 'side-by-side'
  const [displayMode, setDisplayMode] = useState<DisplayMode>('overlay')
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(75)
  const [selectedFinding, setSelectedFinding] = useState<InteractiveFinding | null>(findings[0] || null)
  const [showFindingMarkers, setShowFindingMarkers] = useState<boolean>(true)
  const [techExpanded, setTechExpanded] = useState<boolean>(false)

  return (
    <div className="modal-backdrop">
      <div className="modal explanation-modal">
        {/* Header */}
        <div className="modal-top">
          <div>
            <span className="eyebrow text-primary">EXPLAINABLE AI</span>
            <h2>Why did DrishtiAI flag this?</h2>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close explanation">
            <X size={19} />
          </button>
        </div>

        {/* 6. Plain-Language Explanation */}
        <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs leading-relaxed text-slate-700">
          <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-primary" />
            Decision Support Summary:
          </p>
          “The AI identified retinal regions containing visual patterns associated with diabetic retinopathy.
          The highlighted areas contributed to the screening result.”
        </div>

        {/* 3. Heatmap Controls Bar & Opacity Slider */}
        <div className="explain-controls-bar">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">View Mode:</span>
            <div className="explain-tabs">
              <button
                type="button"
                onClick={() => setDisplayMode('original')}
                className={`explain-tab-btn ${displayMode === 'original' ? 'active' : ''}`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('heatmap')}
                className={`explain-tab-btn ${displayMode === 'heatmap' ? 'active' : ''}`}
              >
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('overlay')}
                className={`explain-tab-btn ${displayMode === 'overlay' ? 'active' : ''}`}
              >
                Overlay
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('side-by-side')}
                className={`explain-tab-btn ${displayMode === 'side-by-side' ? 'active' : ''}`}
              >
                Side-by-side
              </button>
            </div>
          </div>

          {/* Opacity Slider (enabled in overlay & side-by-side) */}
          {(displayMode === 'overlay' || displayMode === 'side-by-side') && (
            <div className="explain-slider-wrap">
              <Sliders size={14} className="text-slate-500" />
              <span>Heatmap opacity: <strong>{heatmapOpacity}%</strong></span>
              <input
                type="range"
                min="0"
                max="100"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                aria-label="Heatmap opacity slider"
              />
            </div>
          )}

          {/* Toggle markers */}
          <button
            type="button"
            onClick={() => setShowFindingMarkers(!showFindingMarkers)}
            className="text-[11px] font-semibold text-slate-600 hover:text-primary flex items-center gap-1"
          >
            {showFindingMarkers ? <Eye size={13} /> : <EyeOff size={13} />}
            {showFindingMarkers ? 'Hide markers' : 'Show markers'}
          </button>
        </div>

        {/* 1 & 2. Retinal Image & Heatmap Canvas Container */}
        {displayMode === 'side-by-side' ? (
          /* Side-by-Side Comparison */
          <div className="explain-side-by-side">
            <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-black aspect-square flex items-center justify-center">
              <img
                src={displayImage}
                alt="Original Retinal Fundus"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wide">
                ORIGINAL FUNDUS
              </span>
            </div>
            <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-black aspect-square flex items-center justify-center">
              <img
                src={displayImage}
                alt="Retinal Base"
                className="w-full h-full object-cover"
              />
              <img
                src={heatmapDataUrl}
                alt="Grad-CAM Heatmap"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  opacity: heatmapOpacity / 100,
                  mixBlendMode: 'screen',
                }}
              />
              {/* Finding Pins */}
              {showFindingMarkers &&
                findings.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFinding(f)}
                    className={`finding-marker-pin ${selectedFinding?.id === f.id ? 'active' : ''}`}
                    style={{
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      width: `${Math.max(f.radius, 16)}px`,
                      height: `${Math.max(f.radius, 16)}px`,
                      backgroundColor: f.markerColor,
                    }}
                    title={`${f.label} (${Math.round(f.confidence * 100)}%)`}
                  />
                ))}
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wide">
                GRAD-CAM OVERLAY ({heatmapOpacity}%)
              </span>
            </div>
          </div>
        ) : (
          /* Single Canvas Viewer (Original / Heatmap / Overlay) */
          <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-black aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center">
            {/* Original Retinal Fundus Base Layer */}
            {displayMode !== 'heatmap' && (
              <img
                src={displayImage}
                alt="Retinal Fundus"
                className="w-full h-full object-cover"
              />
            )}

            {/* Grad-CAM Heatmap Overlay Layer */}
            {displayMode !== 'original' && (
              <img
                src={heatmapDataUrl}
                alt="Grad-CAM Heatmap"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  opacity: displayMode === 'heatmap' ? 1 : heatmapOpacity / 100,
                  mixBlendMode: displayMode === 'heatmap' ? 'normal' : 'screen',
                }}
              />
            )}

            {/* 5. Interactive Finding Markers */}
            {showFindingMarkers &&
              displayMode !== 'original' &&
              findings.map((f) => {
                const isSelected = selectedFinding?.id === f.id
                return (
                  <div
                    key={f.id}
                    className="absolute"
                    style={{
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFinding(f)}
                      className={`finding-marker-pin ${isSelected ? 'active' : ''}`}
                      style={{
                        position: 'static',
                        transform: isSelected ? 'scale(1.35)' : 'scale(1)',
                        width: `${Math.max(f.radius, 18)}px`,
                        height: `${Math.max(f.radius, 18)}px`,
                        backgroundColor: f.markerColor,
                      }}
                      title={`${f.label} (${Math.round(f.confidence * 100)}%)`}
                    />
                    {isSelected && (
                      <span className="absolute left-1/2 -bottom-6 -translate-x-1/2 bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow pointer-events-none">
                        {f.label}
                      </span>
                    )}
                  </div>
                )
              })}

            {/* View Badge */}
            <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
              {displayMode === 'original'
                ? 'ORIGINAL RETINAL FUNDUS'
                : displayMode === 'heatmap'
                ? 'GRAD-CAM ATTENTION MAP'
                : `GRAD-CAM OVERLAY · ${heatmapOpacity}% OPACITY`}
            </span>
          </div>
        )}

        {/* Heatmap Legend */}
        <div className="explain-legend mt-2.5">
          <span>
            <i className="legend-hot" />
            High attention (&gt;80%)
          </span>
          <span>
            <i className="legend-warm" />
            Moderate attention (50–80%)
          </span>
          <span>
            <i className="legend-cool" />
            Low attention (&lt;50%)
          </span>
        </div>

        {/* 4 & 5. Interactive Findings List */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Detected Retinal Findings (Click to inspect):
            </h3>
            <span className="text-[11px] text-slate-500">
              {findings.length} regions flagged
            </span>
          </div>

          <div className="findings-interactive-list">
            {findings.map((f) => {
              const isSelected = selectedFinding?.id === f.id
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFinding(f)}
                  className={`finding-card-interactive ${isSelected ? 'active' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                        style={{ background: f.markerColor }}
                      />
                      <strong className="text-xs text-slate-800">{f.label}</strong>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {Math.round(f.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {f.explanation}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Detailed Selected Finding Explanation Callout */}
          {selectedFinding && (
            <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: selectedFinding.markerColor }}
                  />
                  <strong className="text-slate-900">{selectedFinding.label}</strong>
                  <span className="text-slate-500">· {selectedFinding.location}</span>
                </div>
                <span className="font-bold text-primary">
                  {Math.round(selectedFinding.confidence * 100)}% Confidence
                </span>
              </div>
              <p className="text-slate-700 mb-2 leading-relaxed">
                {selectedFinding.explanation}
              </p>
              <div className="p-2.5 bg-white/90 border border-blue-100 rounded text-[11px] text-slate-600">
                <strong className="text-slate-800">
                  Why this contributed to the AI prediction:{' '}
                </strong>
                {selectedFinding.contributionRationale}
              </div>
            </div>
          )}
        </div>

        {/* 7. Technical Model Explanation (Expandable) */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setTechExpanded(!techExpanded)}
            className="technical-details-toggle"
          >
            <span className="flex items-center gap-2">
              <Cpu size={15} className="text-primary" />
              Technical model explanation
            </span>
            <ChevronRight
              size={15}
              className={`transition-transform duration-200 ${techExpanded ? 'rotate-90' : ''}`}
            />
          </button>

          {techExpanded && (
            <div className="technical-details-content">
              <div className="tech-grid">
                <div className="tech-item">
                  <span>Model:</span>
                  <strong>DrishtiAI Retina v1.0</strong>
                </div>
                <div className="tech-item">
                  <span>Method:</span>
                  <strong>Grad-CAM-style visual explanation</strong>
                </div>
                <div className="tech-item">
                  <span>Input:</span>
                  <strong>Retinal fundus image</strong>
                </div>
                <div className="tech-item">
                  <span>Prediction:</span>
                  <strong>{currentResult.severityLabel}</strong>
                </div>
                <div className="tech-item">
                  <span>Confidence:</span>
                  <strong>{Math.round(currentResult.confidence * 100)}%</strong>
                </div>
                <div className="tech-item">
                  <span>Architecture:</span>
                  <strong>Vision Transformer (ViT-B/16)</strong>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Visual attribution overlays are derived from gradient-weighted class activation mapping (Grad-CAM)
                across penultimate self-attention representations.
              </p>
            </div>
          )}
        </div>

        {/* 8. Uncertainty & Model Confidence Notice */}
        <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-md text-xs">
          <div className="flex items-center justify-between mb-1">
            <strong className="text-amber-900 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-700" />
              Model confidence
            </strong>
            <span className="font-bold text-amber-800">
              {Math.round(currentResult.confidence * 100)}%
            </span>
          </div>
          <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden mb-1.5">
            <div
              className="bg-amber-600 h-full rounded-full"
              style={{ width: `${Math.round(currentResult.confidence * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-amber-800 leading-normal">
            Low-confidence predictions should be reviewed by a qualified healthcare professional.
          </p>
        </div>

        {/* 9. Disclaimer */}
        <div className="disclaimer-banner">
          <ShieldCheck size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p>
            AI explainability indicates which image regions influenced the model prediction.
            It does not establish a medical diagnosis.
          </p>
        </div>

        {/* Footer Button */}
        <div className="mt-4">
          <button
            onClick={onClose}
            className="secondary-button w-full justify-center"
          >
            Close explanation
          </button>
        </div>
      </div>
    </div>
  )
}

