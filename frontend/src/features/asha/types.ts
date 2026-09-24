// Shapes returned by the backend ASHA API (/api/v1/asha/*)

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type TaskStatus = 'overdue' | 'due' | 'upcoming';
export type VisitType = 'GENERAL' | 'ANC' | 'HBNC' | 'HBYC' | 'NCD' | 'FOLLOW_UP';
export type Urgency = 'ROUTINE' | 'URGENT' | 'EMERGENCY';
export type ReferralStatus = 'PENDING' | 'VISITED' | 'NOT_VISITED' | 'CLOSED';
export type Gender = 'F' | 'M' | 'O';

export interface AshaWorkerSession {
  id: number;
  worker_id: string;
  name: string;
  village?: string | null;
  sub_center?: string | null;
}

export interface AshaProfile extends AshaWorkerSession {
  phone?: string | null;
  phc?: string | null;
  block?: string | null;
  district?: string | null;
  state?: string | null;
  population_covered?: number | null;
  supervisor_name?: string | null;
  supervisor_phone?: string | null;
  preferred_language?: string;
  last_login_at?: string | null;
}

export interface MemberBrief {
  id: number;
  name: string;
  gender: Gender;
  dob: string;
  relation?: string | null;
  risk_level: RiskLevel;
}

export interface HouseholdBrief {
  id: number;
  household_code: string;
  head_name: string;
  village: string;
  hamlet?: string | null;
  phone?: string | null;
}

export type TaskAction =
  | { type: 'visit'; visit_type: VisitType; schedule_key: string | null }
  | { type: 'immunization'; vaccines: string[] }
  | { type: 'referral'; referral_id: number }
  | { type: 'delivery'; pregnancy_id: number };

export interface CareTask {
  id: string;
  kind: 'ANC' | 'PW_TD' | 'BIRTH_PREP' | 'DELIVERY' | 'HBNC' | 'HBYC' | 'IMMUNIZATION' | 'NCD' | 'FOLLOW_UP' | 'REFERRAL';
  status: TaskStatus;
  due_date: string;
  priority: number;
  high_risk: boolean;
  params: Record<string, any>;
  action: TaskAction;
  member: MemberBrief;
  household: HouseholdBrief | null;
}

export interface TodaySummary {
  households: number;
  population: number;
  overdue: number;
  due: number;
  upcoming: number;
  screening_due: number;
  pregnant: number;
  high_risk_pregnancies: number;
  high_risk_members: number;
  newborns: number;
  children_u5: number;
  vaccines_overdue: number;
  referrals_pending: number;
  visited_today: number;
}

export interface TodayResponse {
  date: string;
  summary: TodaySummary;
  tasks: CareTask[];
}

export interface Tag {
  code: string;
  value?: string | number;
}

export interface HouseholdListItem extends HouseholdBrief {
  member_count: number;
  members: { id: number; name: string; gender: Gender; dob: string }[];
  tags: string[];
  overdue: number;
  due: number;
  last_visit_date: string | null;
}

export interface AncContact {
  number: number;
  from_week: number;
  to_week: number;
  done: boolean;
  window_start: string;
  window_end: string;
}

export interface PregnancySummary {
  id: number;
  member_id: number;
  lmp_date: string;
  edd: string;
  registered_on: string;
  gravida?: number | null;
  parity?: number | null;
  rch_id?: string | null;
  status: 'ACTIVE' | 'DELIVERED' | 'ENDED';
  high_risk: boolean;
  risk_factors: string[];
  outcome?: string | null;
  outcome_date?: string | null;
  delivery_place?: string | null;
  facility_name?: string | null;
  gestation_weeks: number | null;
  gestation_days: number | null;
  trimester: number | null;
  days_to_edd: number | null;
  anc: AncContact[];
  anc_done: number;
}

export interface RiskReason {
  code: string;
  severity: RiskLevel;
  value?: string | number | null;
}

export interface Member extends MemberBrief {
  household_id: number;
  dob_estimated: boolean;
  age_days: number;
  marital_status?: string | null;
  phone?: string | null;
  abha_number?: string | null;
  mother_id?: number | null;
  birth_weight_kg?: number | null;
  birth_place?: string | null;
  chronic_conditions: string[];
  enrolled_schemes: string[];
  risk_reasons: RiskReason[];
  status: 'ACTIVE' | 'MIGRATED' | 'DECEASED';
  notes?: string | null;
  tags: Tag[];
  pregnancy: PregnancySummary | null;
  task_counts: { overdue: number; due: number };
}

export interface Visit {
  id: number;
  household_id: number;
  member_id: number | null;
  member_name?: string | null;
  pregnancy_id?: number | null;
  visit_type: VisitType;
  schedule_key?: string | null;
  visit_date: string;
  vitals: Record<string, number | null>;
  danger_signs: string[];
  findings: Record<string, any>;
  counselling: string[];
  notes?: string | null;
  risk_level: RiskLevel;
  risk_reasons: RiskReason[];
  next_followup_date?: string | null;
  input_mode: 'FORM' | 'VOICE';
  created_at?: string | null;
}

export interface Referral {
  id: number;
  member: MemberBrief | null;
  household: HouseholdBrief | null;
  visit_id?: number | null;
  reason: string;
  urgency: Urgency;
  facility_type?: string | null;
  facility_name?: string | null;
  referred_on: string;
  status: ReferralStatus;
  visited_on?: string | null;
  outcome_notes?: string | null;
  opd_token?: string | null;
}

export interface SchemeSuggestion {
  code: string;
  enrolled: boolean;
  member_id?: number;
  member_name?: string;
}

export interface HouseholdDetail extends HouseholdBrief {
  address?: string | null;
  social_category?: string | null;
  is_bpl: boolean;
  drinking_water?: string | null;
  has_toilet?: boolean | null;
  consent_given: boolean;
  consent_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  members: Member[];
  tasks: CareTask[];
  visits: Visit[];
  referrals: Referral[];
  schemes: SchemeSuggestion[];
}

export interface VaccineCardItem {
  code: string;
  label: string;
  group: string;
  due_date: string;
  status: 'given' | 'due' | 'overdue' | 'upcoming' | 'missed';
  given_on: string | null;
  immunization_id: number | null;
}

export interface MemberDetail extends Member {
  household: HouseholdBrief;
  tasks: CareTask[];
  past_pregnancies: PregnancySummary[];
  vaccine_card: VaccineCardItem[] | null;
  pregnancy_vaccines: { id: number; code: string; given_on: string }[];
  visits: Visit[];
  referrals: Referral[];
  schemes: SchemeSuggestion[];
  mother: MemberBrief | null;
  children: MemberBrief[];
}

export interface ReferenceData {
  visit_types: Record<VisitType, string>;
  vaccines: { code: string; label: string; due: number; max: number; group: string }[];
  pregnancy_vaccines: { code: string; label: string }[];
  danger_signs: Record<string, { label: string; severity: RiskLevel }>;
  danger_sign_sets: Record<string, string[]>;
  counselling_topics: Record<string, string>;
  chronic_conditions: Record<string, string>;
  schemes: Record<string, { label: string; summary: string }>;
  facility_types: Record<string, string>;
  activity_types: Record<string, string>;
  incentive_rates: Record<string, { label: string; amount: number }>;
  anc_schedule: { number: number; from_week: number; to_week: number }[];
  hbnc_days: number[];
  hbyc_months: number[];
}

export interface MonthlyReport {
  month: string;
  visits_total: number;
  households_visited: number;
  visits_by_type: Record<string, number>;
  new_households: number;
  pregnancies_registered: number;
  deliveries: number;
  institutional_deliveries: number;
  vaccine_doses: number;
  children_fully_immunized: number;
  referrals_made: number;
  referrals_completed: number;
  high_risk_identified: number;
  activities: number;
  incentives: { code: string; label: string; rate: number; count: number; amount: number }[];
  incentive_total: number;
}

export interface Activity {
  id: number;
  activity_type: string;
  activity_date: string;
  topic?: string | null;
  participants?: number | null;
  notes?: string | null;
}

export interface VoiceDraft {
  visit_type: VisitType;
  vitals: Record<string, number>;
  danger_signs: string[];
  summary: string;
  suggested_action: string;
  ai_risk_level: RiskLevel;
  referral_suggested: boolean;
  engine: string;
}
