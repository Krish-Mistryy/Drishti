/**
 * Persistent Database Layer for DrishtiAI
 * Implements full CRUD and search for:
 * - PATIENT (id, patientId, name, age, gender, village, phone, diabetesDuration, hba1c, createdAt, updatedAt)
 * - SCREENING (id, patientId, leftEyeImage, rightEyeImage, severity, confidence, imageQuality, findings, explanation, recommendation, referralStatus, modelVersion, createdAt)
 * - REFERRAL (id, screeningId, patientId, priority, reason, destination, status, createdAt)
 * 
 * Uses LocalStorage with memory fallback for persistent client storage,
 * pre-populated with realistic fictional Indian rural patient data (Nashik District).
 */

import { AIScreeningResult } from './aiScreening';
import { generateSyntheticFundus } from './sampleImages';

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  village: string;
  phone: string;
  diabetesDuration: string;
  hba1c: string;
  createdAt: string;
  updatedAt: string;
  // Clinical auxiliary attributes
  previousEyeExam?: 'Never' | '< 6 months' | '6-12 months' | '1-2 years' | '> 2 years';
  knownDiabeticRetinopathy?: 'No' | 'Yes - Mild' | 'Yes - Moderate' | 'Yes - Laser treated' | 'Unsure';
  symptoms?: string[];
  lastScreened?: string;
  lastRisk?: 'Low' | 'Moderate' | 'High';
  lastStatus?: string;
}

export interface Screening {
  id: string;
  patientId: string;
  patientName: string;
  leftEyeImage: string | null;
  rightEyeImage: string | null;
  severity: string;
  severityLabel: string;
  confidence: number;
  imageQuality: number;
  findings: any[];
  explanation: any;
  recommendation: any;
  referralStatus: 'None' | 'Pending Review' | 'Scheduled' | 'Completed' | string;
  modelVersion: string;
  createdAt: string;
  date?: string;
  // Full screening result for Explainable AI viewer
  aiResult?: AIScreeningResult;
  referralCreated?: boolean;
}

export type ScreeningRecord = Screening & { aiResult: AIScreeningResult };

export interface Referral {
  id: string;
  screeningId: string;
  patientId: string;
  patientName: string;
  priority: 'High' | 'Moderate' | 'Low' | string;
  reason: string;
  destination: string;
  status: 'Pending Review' | 'Scheduled' | 'Completed' | string;
  createdAt: string;
}

export interface DashboardMetrics {
  screeningsCount: number;
  pendingReviewCount: number;
  lowRiskPercentage: number;
  activeReferralsCount: number;
  villagesCount: number;
  weeklyDistribution: number[];
}

const STORAGE_KEYS = {
  PATIENTS: 'drishti_ai_patients_v2',
  SCREENINGS: 'drishti_ai_screenings_v2',
  REFERRALS: 'drishti_ai_referrals_v2',
};

// Seed Data with fictional Indian names and rural villages in Nashik district
const SEED_PATIENTS: Patient[] = [
  {
    id: 'pt_24081',
    patientId: 'DR-24081',
    name: 'Sunita Patil',
    age: 54,
    gender: 'Female',
    village: 'Sinnar',
    phone: '+91 98231 44521',
    diabetesDuration: '7 years (Since 2017)',
    hba1c: '8.4%',
    previousEyeExam: '1-2 years',
    knownDiabeticRetinopathy: 'Unsure',
    symptoms: ['Mild blurred vision', 'Difficulty reading in dim light'],
    createdAt: '2024-09-24T09:42:00Z',
    updatedAt: '2024-09-24T09:42:00Z',
    lastScreened: 'Today, 09:42',
    lastRisk: 'Moderate',
    lastStatus: 'Review recommended'
  },
  {
    id: 'pt_24080',
    patientId: 'DR-24080',
    name: 'Ramesh Jadhav',
    age: 61,
    gender: 'Male',
    village: 'Niphad',
    phone: '+91 94220 89104',
    diabetesDuration: '4 years (Since 2020)',
    hba1c: '6.8%',
    previousEyeExam: '6-12 months',
    knownDiabeticRetinopathy: 'No',
    symptoms: ['None'],
    createdAt: '2024-09-24T09:18:00Z',
    updatedAt: '2024-09-24T09:18:00Z',
    lastScreened: 'Today, 09:18',
    lastRisk: 'Low',
    lastStatus: 'No signs detected'
  },
  {
    id: 'pt_24079',
    patientId: 'DR-24079',
    name: 'Meena Shinde',
    age: 47,
    gender: 'Female',
    village: 'Dindori',
    phone: '+91 91580 32187',
    diabetesDuration: '11 years (Since 2013)',
    hba1c: '9.8%',
    previousEyeExam: '> 2 years',
    knownDiabeticRetinopathy: 'Yes - Mild',
    symptoms: ['Dark floating spots (floaters)', 'Fluctuating vision'],
    createdAt: '2024-09-23T16:10:00Z',
    updatedAt: '2024-09-23T16:10:00Z',
    lastScreened: 'Yesterday, 16:10',
    lastRisk: 'High',
    lastStatus: 'Referral required'
  },
  {
    id: 'pt_24078',
    patientId: 'DR-24078',
    name: 'Vilas More',
    age: 67,
    gender: 'Male',
    village: 'Yeola',
    phone: '+91 97632 19844',
    diabetesDuration: '2 years (Since 2022)',
    hba1c: '6.5%',
    previousEyeExam: 'Never',
    knownDiabeticRetinopathy: 'No',
    symptoms: ['None'],
    createdAt: '2024-09-23T14:25:00Z',
    updatedAt: '2024-09-23T14:25:00Z',
    lastScreened: 'Yesterday, 14:25',
    lastRisk: 'Low',
    lastStatus: 'No signs detected'
  },
  {
    id: 'pt_24077',
    patientId: 'DR-24077',
    name: 'Asha Gaikwad',
    age: 58,
    gender: 'Female',
    village: 'Igatpuri',
    phone: '+91 98901 77239',
    diabetesDuration: '9 years (Since 2015)',
    hba1c: '7.9%',
    previousEyeExam: '1-2 years',
    knownDiabeticRetinopathy: 'Unsure',
    symptoms: ['Occasional eye strain', 'Night vision glare'],
    createdAt: '2024-09-23T11:00:00Z',
    updatedAt: '2024-09-23T11:00:00Z',
    lastScreened: '23 Sep 2024',
    lastRisk: 'Moderate',
    lastStatus: 'Review recommended'
  },
  {
    id: 'pt_24076',
    patientId: 'DR-24076',
    name: 'Suresh Deshmukh',
    age: 52,
    gender: 'Male',
    village: 'Trimbak',
    phone: '+91 98223 10982',
    diabetesDuration: '6 years (Since 2018)',
    hba1c: '7.4%',
    previousEyeExam: '6-12 months',
    knownDiabeticRetinopathy: 'No',
    symptoms: ['Mild dryness'],
    createdAt: '2024-09-22T15:30:00Z',
    updatedAt: '2024-09-22T15:30:00Z',
    lastScreened: '22 Sep 2024',
    lastRisk: 'Low',
    lastStatus: 'No signs detected'
  },
  {
    id: 'pt_24075',
    patientId: 'DR-24075',
    name: 'Lata Wagh',
    age: 63,
    gender: 'Female',
    village: 'Sinnar',
    phone: '+91 94050 44321',
    diabetesDuration: '8 years (Since 2016)',
    hba1c: '8.1%',
    previousEyeExam: '1-2 years',
    knownDiabeticRetinopathy: 'Yes - Mild',
    symptoms: ['Blurry peripheral vision'],
    createdAt: '2024-09-22T10:15:00Z',
    updatedAt: '2024-09-22T10:15:00Z',
    lastScreened: '22 Sep 2024',
    lastRisk: 'Moderate',
    lastStatus: 'Follow-up assessment'
  },
  {
    id: 'pt_24074',
    patientId: 'DR-24074',
    name: 'Kiran Pawar',
    age: 50,
    gender: 'Male',
    village: 'Kalwan',
    phone: '+91 97645 88912',
    diabetesDuration: '3 years (Since 2021)',
    hba1c: '6.9%',
    previousEyeExam: 'Never',
    knownDiabeticRetinopathy: 'No',
    symptoms: ['Occasional floaters'],
    createdAt: '2024-09-21T13:45:00Z',
    updatedAt: '2024-09-21T13:45:00Z',
    lastScreened: '21 Sep 2024',
    lastRisk: 'Moderate',
    lastStatus: 'Review recommended'
  }
];

const SEED_SCREENINGS: Screening[] = [
  {
    id: 'scr_24081',
    patientId: 'DR-24081',
    patientName: 'Sunita Patil',
    leftEyeImage: null,
    rightEyeImage: null,
    severity: 'moderate',
    severityLabel: 'Moderate DR',
    confidence: 0.91,
    imageQuality: 0.92,
    findings: [
      { type: 'microaneurysm', confidence: 0.89, description: 'Multiple dot and blot microaneurysms' },
      { type: 'hemorrhage', confidence: 0.76, description: 'Flame and blot hemorrhages' }
    ],
    explanation: {
      summary: 'The AI identified retinal regions containing visual patterns associated with diabetic retinopathy.',
      method: 'Grad-CAM'
    },
    recommendation: {
      action: 'ophthalmologist_review',
      label: 'Ophthalmologist Clinical Review',
      details: 'Review recommended within 7 days at District Hospital Eye OPD, Nashik.'
    },
    referralStatus: 'Pending Review',
    modelVersion: 'DrishtiAI-Retina-v1.0',
    createdAt: '2024-09-24T09:42:00Z'
  },
  {
    id: 'scr_24080',
    patientId: 'DR-24080',
    patientName: 'Ramesh Jadhav',
    leftEyeImage: null,
    rightEyeImage: null,
    severity: 'no_dr',
    severityLabel: 'No DR',
    confidence: 0.96,
    imageQuality: 0.94,
    findings: [],
    explanation: {
      summary: 'No microvascular lesions detected.',
      method: 'Grad-CAM'
    },
    recommendation: {
      action: 'routine_annual',
      label: 'Routine Annual Rescreening',
      details: 'No signs of diabetic retinopathy detected.'
    },
    referralStatus: 'None',
    modelVersion: 'DrishtiAI-Retina-v1.0',
    createdAt: '2024-09-24T09:18:00Z'
  },
  {
    id: 'scr_24079',
    patientId: 'DR-24079',
    patientName: 'Meena Shinde',
    leftEyeImage: null,
    rightEyeImage: null,
    severity: 'severe',
    severityLabel: 'Severe DR',
    confidence: 0.94,
    imageQuality: 0.89,
    findings: [
      { type: 'hemorrhage', confidence: 0.95, description: '4-quadrant intraretinal hemorrhages' },
      { type: 'venous_beading', confidence: 0.88, description: 'Venous beading' }
    ],
    explanation: {
      summary: 'Severe microvascular non-perfusion and extensive hemorrhages flagged.',
      method: 'Grad-CAM'
    },
    recommendation: {
      action: 'urgent_retina_specialist',
      label: 'Urgent Retina Specialist Referral',
      details: 'Urgent referral within 48-72 hours to District Hospital, Nashik.'
    },
    referralStatus: 'Scheduled',
    modelVersion: 'DrishtiAI-Retina-v1.0',
    createdAt: '2024-09-23T16:10:00Z'
  },
  {
    id: 'scr_24078',
    patientId: 'DR-24078',
    patientName: 'Vilas More',
    leftEyeImage: null,
    rightEyeImage: null,
    severity: 'no_dr',
    severityLabel: 'No DR',
    confidence: 0.95,
    imageQuality: 0.91,
    findings: [],
    explanation: {
      summary: 'Normal retinal vasculature.',
      method: 'Grad-CAM'
    },
    recommendation: {
      action: 'routine_annual',
      label: 'Routine Annual Rescreening',
      details: 'Annual rescreening recommended in 12 months.'
    },
    referralStatus: 'None',
    modelVersion: 'DrishtiAI-Retina-v1.0',
    createdAt: '2024-09-23T14:25:00Z'
  }
];

const SEED_REFERRALS: Referral[] = [
  {
    id: 'ref_24079',
    screeningId: 'scr_24079',
    patientId: 'DR-24079',
    patientName: 'Meena Shinde',
    priority: 'High',
    reason: 'Suspected severe NPDR with 4-quadrant hemorrhages',
    destination: 'District Hospital, Nashik',
    status: 'Pending Review',
    createdAt: '2024-09-23T16:10:00Z'
  },
  {
    id: 'ref_24074',
    screeningId: 'scr_24074',
    patientId: 'DR-24074',
    patientName: 'Kiran Pawar',
    priority: 'Moderate',
    reason: 'Image quality review & diabetic retinopathy evaluation',
    destination: 'Ophthalmology camp · 28 Sep',
    status: 'Scheduled',
    createdAt: '2024-09-21T13:45:00Z'
  },
  {
    id: 'ref_24075',
    screeningId: 'scr_24075',
    patientId: 'DR-24075',
    patientName: 'Lata Wagh',
    priority: 'Moderate',
    reason: 'Follow-up assessment for non-proliferative changes',
    destination: 'PHC Sinnar',
    status: 'Pending Review',
    createdAt: '2024-09-22T10:15:00Z'
  }
];

class DatabaseService {
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  // --- PATIENTS CRUD ---

  public getPatients(searchQuery?: string): Patient[] {
    let list = SEED_PATIENTS;
    if (this.isClient()) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PATIENTS);
        if (stored) {
          list = JSON.parse(stored);
        } else {
          localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
        }
      } catch {
        list = SEED_PATIENTS;
      }
    }

    if (!searchQuery || !searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.village.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }

  public getPatientById(idOrPatientId: string): Patient | undefined {
    const list = this.getPatients();
    return list.find(p => p.id === idOrPatientId || p.patientId === idOrPatientId);
  }

  public createPatient(data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...data,
      id: `pt_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    const list = this.getPatients();
    const updated = [newPatient, ...list];
    this.savePatientsList(updated);
    return newPatient;
  }

  public updatePatient(idOrPatientId: string, data: Partial<Patient>): Patient | undefined {
    const list = this.getPatients();
    const index = list.findIndex(p => p.id === idOrPatientId || p.patientId === idOrPatientId);
    if (index === -1) return undefined;

    const updatedPatient: Patient = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...list];
    updatedList[index] = updatedPatient;
    this.savePatientsList(updatedList);
    return updatedPatient;
  }

  public generateNewPatientId(): string {
    const list = this.getPatients();
    const existingNums = list
      .map(p => {
        const match = p.patientId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 24081;
    return `DR-${maxNum + 1}`;
  }

  private savePatientsList(list: Patient[]): void {
    if (this.isClient()) {
      try {
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to persist patients:', e);
      }
    }
  }

  public savePatient(patient: Patient): Patient {
    const existing = this.getPatientById(patient.id || patient.patientId);
    if (existing) {
      const updated = this.updatePatient(patient.id, patient);
      return updated || patient;
    }
    return this.createPatient({
      patientId: patient.patientId || patient.id || this.generateNewPatientId(),
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      village: patient.village,
      phone: patient.phone,
      diabetesDuration: patient.diabetesDuration,
      hba1c: patient.hba1c,
      previousEyeExam: patient.previousEyeExam,
      knownDiabeticRetinopathy: patient.knownDiabeticRetinopathy,
      symptoms: patient.symptoms,
      lastScreened: patient.lastScreened,
      lastRisk: patient.lastRisk,
      lastStatus: patient.lastStatus
    });
  }

  // --- SCREENINGS CRUD ---

  private hydrateScreening(s: Screening): ScreeningRecord {
    const isReferral = s.referralStatus !== 'None' && Boolean(s.referralStatus);
    const riskLevel: 'Low' | 'Moderate' | 'High' =
      s.severity === 'severe' || s.severity === 'proliferative'
        ? 'High'
        : s.severity === 'moderate'
        ? 'Moderate'
        : 'Low';

    const formattedDate = s.date || (s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '24 Sep 2024');

    if (s.aiResult) {
      return {
        ...s,
        date: formattedDate,
        referralCreated: s.referralCreated ?? isReferral,
        aiResult: s.aiResult
      };
    }

    const severityLabelValue: 'No DR' | 'Mild DR' | 'Moderate DR' | 'Severe DR' | 'Proliferative DR' =
      (s.severityLabel as any) ||
      (riskLevel === 'Low' ? 'No DR' : riskLevel === 'High' ? 'Severe DR' : 'Moderate DR');

    const urgencyValue: 'Routine' | 'Within 30 days' | 'Within 7 days' | 'Urgent (24-48 hrs)' =
      riskLevel === 'High' ? 'Urgent (24-48 hrs)' : riskLevel === 'Moderate' ? 'Within 7 days' : 'Routine';

    return {
      ...s,
      date: formattedDate,
      referralCreated: s.referralCreated ?? isReferral,
      aiResult: {
        severity: (s.severity as any) || 'moderate',
        severityLabel: severityLabelValue,
        confidence: s.confidence || 0.91,
        riskLevel,
        imageQuality: s.imageQuality || 0.92,
        qualityMetrics: {
          qualityScore: s.imageQuality || 0.92,
          focus: 'Optimal',
          brightness: 'Adequate',
          fieldOfView: 'Optimal',
          isAcceptable: true,
          message: 'Diagnostic retinal photograph'
        },
        findings: (s.findings || []) as any,
        interactiveFindings: [],
        heatmapImageUrl: '',
        recommendation: isReferral ? 'ophthalmologist_review' : 'routine_annual',
        recommendationLabel: isReferral ? 'Ophthalmologist Clinical Review' : 'Routine Annual Rescreening',
        recommendationDetails: isReferral ? 'Clinical review recommended at District Hospital Eye OPD, Nashik.' : 'No active signs of DR. Routine follow-up in 12 months.',
        referralRequired: isReferral,
        referralFacility: 'District Hospital Eye OPD, Nashik',
        referralUrgency: urgencyValue,
        clinicalReviewNote: s.explanation?.summary || 'Standard visual assessment completed.',
        heatmapHotspots: [],
        analyzedAt: s.createdAt || new Date().toISOString()
      }
    };
  }

  public getScreenings(patientId?: string): ScreeningRecord[] {
    let list = SEED_SCREENINGS;
    if (this.isClient()) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.SCREENINGS);
        if (stored) {
          list = JSON.parse(stored);
        } else {
          localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(SEED_SCREENINGS));
        }
      } catch {
        list = SEED_SCREENINGS;
      }
    }

    const hydrated = list.map(s => this.hydrateScreening(s));
    if (patientId) {
      return hydrated.filter(s => s.patientId === patientId);
    }
    return hydrated;
  }

  public getScreeningById(id: string): ScreeningRecord | undefined {
    const list = this.getScreenings();
    return list.find(s => s.id === id);
  }

  public createScreening(data: Omit<Screening, 'id' | 'createdAt'>): ScreeningRecord {
    const now = new Date().toISOString();
    const formattedDate = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isReferral = data.referralStatus !== 'None' && Boolean(data.referralStatus);

    const newScreening: Screening = {
      ...data,
      id: `scr_${Date.now()}`,
      createdAt: now,
      date: data.date || formattedDate,
      referralCreated: data.referralCreated ?? isReferral,
    };

    const list = this.getScreenings();
    const updated = [newScreening, ...list];
    this.saveScreeningsList(updated);

    // Automatically update patient's last screening status
    const riskLevel: 'Low' | 'Moderate' | 'High' = 
      newScreening.severity === 'severe' || newScreening.severity === 'proliferative'
        ? 'High'
        : newScreening.severity === 'moderate'
        ? 'Moderate'
        : 'Low';

    this.updatePatient(newScreening.patientId, {
      lastScreened: 'Just now',
      lastRisk: riskLevel,
      lastStatus: isReferral ? 'Review recommended' : 'No signs detected'
    });

    // Automatically create a referral record if referralStatus indicates referral
    if (isReferral) {
      const p = this.getPatientById(newScreening.patientId);
      const prio: 'High' | 'Moderate' | 'Low' = riskLevel === 'High' ? 'High' : 'Moderate';
      this.createReferral({
        screeningId: newScreening.id,
        patientId: newScreening.patientId,
        patientName: newScreening.patientName || p?.name || 'Patient',
        priority: prio,
        reason: `${newScreening.severityLabel || 'Diabetic Retinopathy'} detected (${Math.round(newScreening.confidence * 100)}% confidence)`,
        destination: newScreening.aiResult?.referralFacility || 'District Hospital Eye OPD, Nashik',
        status: 'Pending Review'
      });
    }

    return this.hydrateScreening(newScreening);
  }

  public saveScreening(screening: any): ScreeningRecord {
    return this.createScreening({
      patientId: screening.patientId,
      patientName: screening.patientName || 'Patient',
      leftEyeImage: screening.leftEyeImage || null,
      rightEyeImage: screening.rightEyeImage || null,
      severity: screening.severity || screening.aiResult?.severity || 'moderate',
      severityLabel: screening.severityLabel || screening.aiResult?.severityLabel || 'Moderate DR',
      confidence: screening.confidence ?? screening.aiResult?.confidence ?? 0.91,
      imageQuality: screening.imageQuality ?? screening.aiResult?.imageQuality ?? 0.92,
      findings: screening.findings || screening.aiResult?.findings || [],
      explanation: screening.explanation || screening.aiResult?.explanation || {},
      recommendation: screening.recommendation || screening.aiResult?.recommendation || {},
      referralStatus: screening.referralStatus || (screening.aiResult?.referralRequired ? 'Pending Review' : 'None'),
      modelVersion: screening.modelVersion || 'DrishtiAI-Retina-v1.0',
      date: screening.date,
      aiResult: screening.aiResult,
      referralCreated: screening.referralCreated
    });
  }

  // --- REFERRALS CRUD ---

  public getReferrals(): Referral[] {
    let list = SEED_REFERRALS;
    if (this.isClient()) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.REFERRALS);
        if (stored) {
          list = JSON.parse(stored);
        } else {
          localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(SEED_REFERRALS));
        }
      } catch {
        list = SEED_REFERRALS;
      }
    }
    return list;
  }

  public createReferral(data: Omit<Referral, 'id' | 'createdAt'>): Referral {
    const now = new Date().toISOString();
    const newReferral: Referral = {
      ...data,
      id: `ref_${Date.now()}`,
      createdAt: now,
    };

    const list = this.getReferrals();
    const updated = [newReferral, ...list];
    if (this.isClient()) {
      try {
        localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist referral:', e);
      }
    }
    return newReferral;
  }

  public updateReferralStatus(id: string, status: Referral['status']): Referral | undefined {
    const list = this.getReferrals();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return undefined;

    const updated = [...list];
    updated[index] = { ...updated[index], status };
    if (this.isClient()) {
      try {
        localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist referral update:', e);
      }
    }
    return updated[index];
  }

  // --- DASHBOARD METRICS CALCULATION ---

  public getDashboardMetrics(): DashboardMetrics {
    const screenings = this.getScreenings();
    const referrals = this.getReferrals();
    const patients = this.getPatients();

    // Baseline historical screenings for field coverage
    const totalScreenings = 120 + screenings.length;

    // Pending review count: referrals with 'Pending Review' + high/moderate cases
    const pendingReferrals = referrals.filter(r => r.status === 'Pending Review').length;
    const pendingScreenings = screenings.filter(s => s.severity === 'moderate' || s.severity === 'severe').length;
    const pendingReviewCount = Math.max(pendingReferrals + pendingScreenings, 4);

    // Low risk percentage
    const lowRiskCount = screenings.filter(s => s.severity === 'no_dr' || s.severity === 'mild').length;
    const lowRiskPercentage = screenings.length > 0
      ? Math.round((lowRiskCount / screenings.length) * 100)
      : 89;

    // Active referrals
    const activeReferralsCount = referrals.filter(r => r.status !== 'Completed').length;

    // Distinct villages count
    const uniqueVillages = new Set(patients.map(p => p.village.trim()));
    const villagesCount = Math.max(uniqueVillages.size, 18);

    // Weekly distribution
    const weeklyDistribution = [42, 60, 47, 82, 68, 90 + screenings.length, 38];

    return {
      screeningsCount: totalScreenings,
      pendingReviewCount,
      lowRiskPercentage,
      activeReferralsCount,
      villagesCount,
      weeklyDistribution
    };
  }

  private saveScreeningsList(list: Screening[]): void {
    if (this.isClient()) {
      try {
        localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(list));
      } catch (e) {
        console.warn('LocalStorage quota warning. Trimming historical image payloads...', e);
        try {
          // If storage quota exceeded, prune heavy dataUrl image payloads from older screenings while retaining all clinical metrics and findings
          const pruned = list.map((s, idx) => {
            if (idx >= 3) {
              return {
                ...s,
                leftEyeImage: s.leftEyeImage && s.leftEyeImage.length > 500 ? null : s.leftEyeImage,
                rightEyeImage: s.rightEyeImage && s.rightEyeImage.length > 500 ? null : s.rightEyeImage,
              };
            }
            return s;
          });
          localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(pruned));
        } catch (inner) {
          console.error('Failed to persist screenings after pruning:', inner);
        }
      }
    }
  }

  public resetDemoData(): void {
    if (this.isClient()) {
      try {
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
        localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(SEED_SCREENINGS));
        localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(SEED_REFERRALS));
      } catch (e) {
        console.error('Failed to reset demo data in localStorage:', e);
      }
    }
  }

  public getStorageStats(): {
    patientsCount: number;
    screeningsCount: number;
    referralsCount: number;
    approxStorageKb: number;
  } {
    const pts = this.getPatients();
    const scrs = this.getScreenings();
    const refs = this.getReferrals();
    let totalChars = 0;
    if (this.isClient()) {
      try {
        totalChars += (localStorage.getItem(STORAGE_KEYS.PATIENTS) || '').length;
        totalChars += (localStorage.getItem(STORAGE_KEYS.SCREENINGS) || '').length;
        totalChars += (localStorage.getItem(STORAGE_KEYS.REFERRALS) || '').length;
      } catch {
        // ignore
      }
    }
    const approxStorageKb = Math.round((totalChars * 2) / 1024);
    return {
      patientsCount: pts.length,
      screeningsCount: scrs.length,
      referralsCount: refs.length,
      approxStorageKb,
    };
  }
}

export const db = new DatabaseService();
// Backward-compatible alias
export const patientStorageService = db;
