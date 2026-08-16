import React, { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Textarea } from '../components/common/Textarea';
import { Select } from '../components/common/Select';
import { Checkbox } from '../components/common/Checkbox';
import { Radio } from '../components/common/Radio';
import { SearchInput } from '../components/common/SearchInput';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { IconButton } from '../components/common/IconButton';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Progress } from '../components/common/Progress';
import { Skeleton } from '../components/common/Skeleton';

// Chat Domain Components
import { AiAvatar } from '../components/chat/AiAvatar';
import { AiMessage } from '../components/chat/AiMessage';
import { UserMessage } from '../components/chat/UserMessage';
import { SystemMessage } from '../components/chat/SystemMessage';
import { SuggestionButton } from '../components/chat/SuggestionButton';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { VoiceButton } from '../components/chat/VoiceButton';

// Risk Domain Components
import { RiskBadge } from '../components/risk/RiskBadge';
import { RiskIndicator } from '../components/risk/RiskIndicator';
import { RiskReason } from '../components/risk/RiskReason';
import { RecommendationBlock } from '../components/risk/RecommendationBlock';
import { SafetyDisclaimer } from '../components/risk/SafetyDisclaimer';

// Hospital Domain Components
import { HospitalCard } from '../components/hospital/HospitalCard';
import { FacilityTypeBadge } from '../components/hospital/FacilityTypeBadge';
import { EmergencyAvailability } from '../components/hospital/EmergencyAvailability';

// Report Domain Components
import { ReportUploadArea } from '../components/report/ReportUploadArea';
import { LabStatus } from '../components/report/LabStatus';
import { LabValue } from '../components/report/LabValue';
import { ExplanationBlock } from '../components/report/ExplanationBlock';

import { 
  Heart, 
  Sparkles, 
  Stethoscope, 
  Search, 
  Send,
  AlertCircle,
  FileCheck2
} from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioSelected, setRadioSelected] = useState('option1');
  const [isRecording, setIsRecording] = useState(false);

  return (
    <AppShell pageMode="marketing">
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col gap-2 mb-10 pb-6 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Badge variant="teal">Phase 1 Visual Language</Badge>
            <Badge variant="neutral">Development Showcase</Badge>
          </div>
          <h1 className="text-display text-content-primary">
            SehatMitra AI Design System
          </h1>
          <p className="text-body-md text-content-muted max-w-3xl">
            Interactive visual preview of all color tokens, typography scales, buttons, form controls, surface cards, risk levels, domain foundations, and accessibility states.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          
          {/* SECTION 1: COLOR SYSTEM */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">1. Color Palette & Tokens</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Primary Teal */}
              <div className="p-4 rounded-md border border-surface-border bg-surface-card flex flex-col gap-2 shadow-subtle">
                <span className="text-xs font-bold uppercase text-content-muted">Primary Healthcare Teal</span>
                <div className="h-16 rounded bg-brand-600 flex items-center justify-center text-white font-mono text-xs font-bold">
                  brand-600 (#0D9488)
                </div>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  <div className="h-6 rounded bg-brand-100" title="brand-100" />
                  <div className="h-6 rounded bg-brand-300" title="brand-300" />
                  <div className="h-6 rounded bg-brand-500" title="brand-500" />
                  <div className="h-6 rounded bg-brand-700" title="brand-700" />
                  <div className="h-6 rounded bg-brand-900" title="brand-900" />
                </div>
              </div>

              {/* Secondary Blue */}
              <div className="p-4 rounded-md border border-surface-border bg-surface-card flex flex-col gap-2 shadow-subtle">
                <span className="text-xs font-bold uppercase text-content-muted">Secondary Medical Blue</span>
                <div className="h-16 rounded bg-medical-600 flex items-center justify-center text-white font-mono text-xs font-bold">
                  medical-600 (#0284C7)
                </div>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  <div className="h-6 rounded bg-medical-100" title="medical-100" />
                  <div className="h-6 rounded bg-medical-300" title="medical-300" />
                  <div className="h-6 rounded bg-medical-500" title="medical-500" />
                  <div className="h-6 rounded bg-medical-700" title="medical-700" />
                  <div className="h-6 rounded bg-medical-900" title="medical-900" />
                </div>
              </div>

              {/* Surface Hierarchy */}
              <div className="p-4 rounded-md border border-surface-border bg-surface-card flex flex-col gap-2 shadow-subtle">
                <span className="text-xs font-bold uppercase text-content-muted">Surface Hierarchy</span>
                <div className="flex flex-col gap-1.5 text-xs font-medium">
                  <div className="p-2 bg-surface-bg border border-surface-border rounded">Background (#FAFAF9)</div>
                  <div className="p-2 bg-surface-card border border-surface-border rounded">Card (#FFFFFF)</div>
                  <div className="p-2 bg-surface-elevated border border-surface-border rounded">Elevated (#F5F5F4)</div>
                </div>
              </div>

              {/* Semantic Risk Colors */}
              <div className="p-4 rounded-md border border-surface-border bg-surface-card flex flex-col gap-2 shadow-subtle">
                <span className="text-xs font-bold uppercase text-content-muted">Semantic Risk Tokens</span>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold">Low Risk</div>
                  <div className="p-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold">Moderate Risk</div>
                  <div className="p-1.5 bg-orange-50 text-orange-900 border border-orange-200 rounded font-semibold">High Risk</div>
                  <div className="p-1.5 bg-red-100 text-red-900 border border-red-300 rounded font-semibold">Emergency</div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: TYPOGRAPHY */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">2. Typography Hierarchy</h2>
            <Card className="flex flex-col gap-4">
              <div className="border-b border-surface-border pb-3">
                <span className="text-xs text-content-muted uppercase">Display Heading (36px)</span>
                <p className="text-display text-content-primary">Quiet Confidence in Healthcare AI</p>
              </div>
              <div className="border-b border-surface-border pb-3">
                <span className="text-xs text-content-muted uppercase">H1 Heading (30px)</span>
                <p className="text-h1 text-content-primary">Your Intelligent Medical Companion</p>
              </div>
              <div className="border-b border-surface-border pb-3">
                <span className="text-xs text-content-muted uppercase">H2 Heading (24px)</span>
                <p className="text-h2 text-content-primary">Explainable Symptom Triage & Guidance</p>
              </div>
              <div className="border-b border-surface-border pb-3">
                <span className="text-xs text-content-muted uppercase">H3 Heading (20px)</span>
                <p className="text-h3 text-content-primary">Nearby Healthcare Facilities & ER Status</p>
              </div>
              <div className="border-b border-surface-border pb-3">
                <span className="text-xs text-content-muted uppercase">Body Large (18px)</span>
                <p className="text-body-lg text-content-primary">
                  SehatMitra AI helps patients navigate symptoms with clear explanations, local hospital discovery, and medical report translation.
                </p>
              </div>
              <div>
                <span className="text-xs text-content-muted uppercase">Body Regular (16px)</span>
                <p className="text-body-md text-content-primary">
                  Standard body text line height is generous (1.625) to ensure clinical information remains readable across all desktop and mobile screens.
                </p>
              </div>
            </Card>
          </section>

          {/* SECTION 3: BUTTON SYSTEM */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">3. Button Variants & States</h2>
            <Card className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">Danger Button</Button>
                <Button variant="emergency">Emergency CTA</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-surface-border">
                <span className="text-xs font-semibold text-content-muted w-full">Button Sizes & Icons:</span>
                <Button variant="primary" size="sm" leftIcon={<Heart className="w-3.5 h-3.5" />}>
                  Small Primary
                </Button>
                <Button variant="primary" size="md" rightIcon={<Send className="w-4 h-4" />}>
                  Medium Primary
                </Button>
                <Button variant="primary" size="lg" leftIcon={<Sparkles className="w-5 h-5" />}>
                  Large Primary
                </Button>
                <Button variant="primary" isLoading>
                  Loading State
                </Button>
                <Button variant="primary" disabled>
                  Disabled State
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-surface-border">
                <span className="text-xs font-semibold text-content-muted">Icon Buttons:</span>
                <IconButton aria-label="Search" variant="outline"><Search className="w-4 h-4" /></IconButton>
                <IconButton aria-label="Stethoscope" variant="primary"><Stethoscope className="w-4 h-4" /></IconButton>
                <IconButton aria-label="Alert" variant="danger"><AlertCircle className="w-4 h-4" /></IconButton>
              </div>
            </Card>
          </section>

          {/* SECTION 4: FORM CONTROLS */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">4. Extended Form Controls</h2>
            <Card className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                placeholder="e.g. Rahul Sharma"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                hint="Enter name for health record."
              />
              <Input
                label="Email Address"
                placeholder="rahul@example.com"
                isSuccess
                value="rahul@example.com"
                readOnly
                hint="Verified email address."
              />
              <Input
                label="Mobile Number"
                placeholder="9876543210"
                error="Please enter a valid 10-digit mobile number."
              />
              <Select
                label="Preferred Language"
                options={[
                  { value: 'hi', label: 'Hindi (हिन्दी)' },
                  { value: 'en', label: 'English' },
                  { value: 'bn', label: 'Bengali (বাংলা)' },
                ]}
              />
              <SearchInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClear={() => setSearchValue('')}
                placeholder="Search medical symptoms or hospital..."
              />
              <Textarea
                label="Describe your primary health complaint"
                placeholder="Specify onset, duration, and severity..."
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
                maxLength={200}
                showCharCount
              />
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-content-primary">Checkboxes & Radios</span>
                <Checkbox
                  label="I understand this is an AI assistant, not a doctor."
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                />
                <Radio
                  name="demo-radio"
                  label="Male"
                  checked={radioSelected === 'option1'}
                  onChange={() => setRadioSelected('option1')}
                />
                <Radio
                  name="demo-radio"
                  label="Female"
                  checked={radioSelected === 'option2'}
                  onChange={() => setRadioSelected('option2')}
                />
              </div>
            </Card>
          </section>

          {/* SECTION 5: CARD & BADGE VARIANTS */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">5. Cards & Badges</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="basic">
                <Badge variant="teal" className="mb-2">Basic Card</Badge>
                <h3 className="text-base font-bold text-content-primary">Basic Restrained Surface</h3>
                <p className="text-xs text-content-muted mt-1">Standard card surface with 1px subtle border.</p>
              </Card>

              <Card variant="interactive">
                <Badge variant="blue" className="mb-2">Interactive Card</Badge>
                <h3 className="text-base font-bold text-content-primary">Clickable Hover Card</h3>
                <p className="text-xs text-content-muted mt-1">Highlights border and subtle elevation on hover.</p>
              </Card>

              <Card variant="emergency">
                <Badge variant="emergency" className="mb-2">Emergency Level</Badge>
                <h3 className="text-base font-bold text-red-900">Urgent Triage Needed</h3>
                <p className="text-xs text-red-800 mt-1">Highlighted alert card with red surface tint.</p>
              </Card>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-4 rounded-md border border-surface-border bg-surface-card">
              <span className="text-xs font-semibold text-content-muted w-full mb-1">Badge System & Domain Badges:</span>
              <Badge variant="teal">Teal Tag</Badge>
              <Badge variant="blue">Blue Tag</Badge>
              <Badge variant="neutral">Neutral Tag</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="emergency">Emergency</Badge>
              <RiskBadge level="low" />
              <RiskBadge level="moderate" />
              <RiskBadge level="high" />
              <RiskBadge level="emergency" />
              <FacilityTypeBadge type="Government" />
              <FacilityTypeBadge type="Private" />
              <EmergencyAvailability isAvailable={true} />
              <LabStatus status="normal" />
              <LabStatus status="critical" />
            </div>
          </section>

          {/* SECTION 6: CHAT DOMAIN FOUNDATION */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">6. AI & Chat Foundation</h2>
            <Card className="flex flex-col gap-4 max-w-3xl">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <AiAvatar size="md" isOnline />
                  <span className="text-sm font-bold">SehatMitra Assistant</span>
                </div>
                <VoiceButton isRecording={isRecording} onToggleRecording={() => setIsRecording(!isRecording)} />
              </div>

              <SystemMessage message="Encrypted healthcare consultation session started" />

              <AiMessage
                content="Namaste! I am SehatMitra AI. I can help evaluate your health symptoms, locate nearby emergency services, and explain medical reports. How are you feeling today?"
                timestamp="10:30 AM"
              />

              <UserMessage
                content="I have had a mild headache and low fever since yesterday evening."
                timestamp="10:31 AM"
              />

              <TypingIndicator />

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border">
                <span className="text-xs text-content-muted font-medium">Quick Suggestions:</span>
                <SuggestionButton label="Check fever symptoms" icon={<Stethoscope className="w-3.5 h-3.5" />} />
                <SuggestionButton label="Find nearby clinic" />
              </div>
            </Card>
          </section>

          {/* SECTION 7: RISK DOMAIN FOUNDATION */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">7. Triage & Risk Assessment Foundation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <RiskIndicator level="moderate" score={45} title="Calculated Triage Severity" />
                <RiskReason
                  factors={[
                    { id: '1', title: 'Low-grade fever (100.2°F)', description: 'Elevated temperature sustained for > 12 hours.', severity: 'moderate' },
                    { id: '2', title: 'No severe chest pain', description: 'Absence of cardiac emergency indicators.', severity: 'low' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-4">
                <RecommendationBlock
                  title="Triage Recommendations"
                  recommendations={[
                    'Stay hydrated and rest in a cool room.',
                    'Monitor temperature every 4 hours.',
                    'Consult a local physician if fever exceeds 102°F or persists > 48 hours.',
                  ]}
                  primaryActionLabel="Find Nearby Clinic"
                  onPrimaryAction={() => {}}
                />
                <SafetyDisclaimer />
              </div>
            </div>
          </section>

          {/* SECTION 8: HOSPITAL DOMAIN FOUNDATION */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">8. Hospital Finder Components</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HospitalCard
                facility={{
                  id: 'h1',
                  name: 'City General Government Hospital',
                  type: 'Government',
                  distanceKm: 1.8,
                  address: 'Civil Lines, Main Road, Block B',
                  phone: '+91 11 2345 6789',
                  has24x7Emergency: true,
                  rating: 4.5,
                }}
              />
              <HospitalCard
                facility={{
                  id: 'h2',
                  name: 'Apex Super Specialty Care',
                  type: 'Private',
                  distanceKm: 3.4,
                  address: 'Sector 14, Healthcare Avenue',
                  phone: '+91 11 9876 5432',
                  has24x7Emergency: false,
                  rating: 4.2,
                }}
              />
            </div>
          </section>

          {/* SECTION 9: REPORT EXPLANATION FOUNDATION */}
          <section className="flex flex-col gap-4">
            <h2 className="text-h2 border-b border-surface-border pb-2">9. Medical Report Explanation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReportUploadArea />
              <div className="flex flex-col gap-3">
                <ExplanationBlock
                  medicalTerm="Hemoglobin (Hb)"
                  simpleExplanation="Oxygen-carrying protein in red blood cells."
                  clinicalContext="Slightly low levels may indicate mild iron deficiency fatigue."
                />
                <LabValue
                  item={{
                    id: 'lv1',
                    name: 'Hemoglobin',
                    value: '9.2',
                    unit: 'g/dL',
                    referenceRange: '12.0 - 15.5 g/dL',
                    status: 'below_normal',
                    explanation: 'Your hemoglobin level is below standard reference ranges.',
                  }}
                />
              </div>
            </div>
          </section>

          {/* SECTION 10: LOADING, EMPTY & ERROR STATES */}
          <section className="flex flex-col gap-4 mb-12">
            <h2 className="text-h2 border-b border-surface-border pb-2">10. Loading, Skeleton, Empty & Error States</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <span className="text-xs font-semibold text-content-muted mb-2 block">Loading State</span>
                <LoadingState message="Analyzing clinical input..." />
              </Card>

              <Card className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-content-muted block">Skeleton Loaders</span>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="rectangular" height={40} />
                <Skeleton variant="rectangular" height={80} />
              </Card>

              <Card>
                <span className="text-xs font-semibold text-content-muted mb-2 block">Progress Bar</span>
                <Progress value={65} label="Health Assessment Progress" showPercentage />
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <EmptyState
                title="No Previous Medical Records Found"
                description="Upload your lab reports or start a new health questionnaire to view recommendations."
                actionLabel="Upload Report"
                onAction={() => {}}
                icon={<FileCheck2 className="w-10 h-10 text-brand-600" />}
              />
              <ErrorState
                title="Connection Timeout"
                message="We couldn't retrieve facility recommendations right now. Please check your internet connection."
                onRetry={() => {}}
              />
            </div>
          </section>

        </div>
      </PageContainer>
    </AppShell>
  );
};
