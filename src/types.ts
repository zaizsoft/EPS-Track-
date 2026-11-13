export type ObservationType = 
  | 'absent'      // غياب (Absent)
  | 'late'        // تأخر (Retard)
  | 'no_uniform'  // بدون بدلة رياضية (Sans Tenue)
  | 'positive'    // مشاركة أو سلوك إيجابي (+)
  | 'negative'    // تشتت أو ملاحظة سلبية (-)
  | 'dispensed'   // إعفاء طبي (Dispensé)
  | 'injury';     // إصابة أثناء الحصة (Blessure)

export interface ClassGroup {
  id: string;
  name: string;
  grade: string;
  academicYear: string;
  studentCount: number;
  scheduleDay?: string;
  scheduleTime?: string;
  colorTag: string;
}

export interface Student {
  id: string;
  classId: string;
  studentNumber: number; // رقم التلميذ في القائمة
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  medicalStatus?: string; // سليم، إعفاء دائم، حساسية...
  notesCount?: number;
  avatarSeed?: string;
}

export interface Observation {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: number;
  classId: string;
  className: string;
  type: ObservationType;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm:ss
  timestamp: number;
  noteText?: string;
  sessionTopic?: string;
  synced: boolean;
}

export interface TeacherProfile {
  name: string;
  schoolName: string;
  subject: string;
  academicYear: string;
}

export type ThemeMode = 'light' | 'dark';

export type CloudConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface GoogleAuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}
