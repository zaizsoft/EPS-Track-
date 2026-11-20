import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ClassGroup, Student, Observation, TeacherProfile } from './types';
import { getLocalDateStr, getLocalTimeStr } from './utils/date';

const app = initializeApp(firebaseConfig);

function createFirestoreDb(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreDb();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sanitizers aligned strictly with firebase-blueprint.json boundaries
function sanitizeId(raw: string, fallbackPrefix = 'id'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(val: string | undefined, maxLen: number, fallback = ''): string {
  const str = (val ?? fallback).trim();
  return str.slice(0, maxLen);
}

function clampInt(val: number, min: number, max: number): number {
  const n = Math.floor(Number.isFinite(val) ? val : min);
  return Math.max(min, Math.min(max, n));
}

function formatDateYYYYMMDD(raw?: string): string {
  if (raw && raw.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return getLocalDateStr();
}

function formatTimeHHMMSS(raw?: string): string {
  if (raw && raw.length >= 5 && raw.length <= 12) return raw;
  return getLocalTimeStr();
}

export function onFirebaseAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

function buildTeacherPayload(
  uid: string,
  profile: TeacherProfile,
  activeSessionTopic: string
) {
  return {
    ownerId: uid,
    name: clampStr(profile.name, 120, 'أستاذ التربية البدنية'),
    schoolName: clampStr(profile.schoolName, 160, 'المؤسسة التربوية'),
    subject: clampStr(profile.subject, 120, 'التربية البدنية والرياضية'),
    academicYear: clampStr(profile.academicYear, 32, '2026 - 2027'),
    activeSessionTopic: clampStr(activeSessionTopic, 160, ''),
  };
}

function buildClassPayload(uid: string, cls: ClassGroup) {
  const payload: Record<string, unknown> = {
    id: sanitizeId(cls.id, 'cls'),
    ownerId: uid,
    name: clampStr(cls.name, 80, 'قسم'),
    grade: clampStr(cls.grade, 80, 'ابتدائي'),
    academicYear: clampStr(cls.academicYear, 32, '2026/2027'),
    studentCount: clampInt(cls.studentCount, 0, 500),
    colorTag: clampStr(cls.colorTag, 32, 'emerald'),
  };
  if (cls.scheduleDay) payload.scheduleDay = clampStr(cls.scheduleDay, 40);
  if (cls.scheduleTime) payload.scheduleTime = clampStr(cls.scheduleTime, 40);
  return payload;
}

function buildStudentPayload(uid: string, student: Student) {
  const payload: Record<string, unknown> = {
    id: sanitizeId(student.id, 'std'),
    ownerId: uid,
    classId: sanitizeId(student.classId, 'cls'),
    studentNumber: clampInt(student.studentNumber, 1, 500),
    firstName: clampStr(student.firstName, 80, 'تلميذ'),
    lastName: clampStr(student.lastName, 80, '—'),
    gender: student.gender === 'F' ? 'F' : 'M',
  };
  if (student.medicalStatus) {
    payload.medicalStatus = clampStr(student.medicalStatus, 160);
  }
  return payload;
}

function buildObservationPayload(uid: string, obs: Observation) {
  const payload: Record<string, unknown> = {
    id: sanitizeId(obs.id, 'obs'),
    ownerId: uid,
    studentId: sanitizeId(obs.studentId, 'std'),
    studentName: clampStr(obs.studentName, 160, 'تلميذ'),
    studentNumber: clampInt(obs.studentNumber, 1, 500),
    classId: sanitizeId(obs.classId, 'cls'),
    className: clampStr(obs.className, 80, 'قسم'),
    type: obs.type,
    date: formatDateYYYYMMDD(obs.date),
    time: formatTimeHHMMSS(obs.time),
    timestamp: clampInt(obs.timestamp, 1, Number.MAX_SAFE_INTEGER),
  };
  if (obs.noteText) payload.noteText = clampStr(obs.noteText, 300);
  if (obs.sessionTopic) payload.sessionTopic = clampStr(obs.sessionTopic, 160);
  return payload;
}

const workspaceEnsurePromises = new Map<string, Promise<void>>();

/**
 * Ensures the teacher's root workspace exists in Firestore, and safely seeds
 * classes/students/observations on first setup without overwriting or racing.
 */
export async function ensureTeacherWorkspace(
  uid: string,
  profile: TeacherProfile,
  activeSessionTopic: string,
  classes: ClassGroup[],
  students: Student[],
  observations: Observation[]
): Promise<void> {
  const existingPromise = workspaceEnsurePromises.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const runPromise = (async () => {
    const teacherRef = doc(db, 'teachers', uid);
    const teacherPath = `teachers/${uid}`;

    let teacherExists = false;
    try {
      const snap = await getDocFromServer(teacherRef).catch(() => getDoc(teacherRef));
      teacherExists = snap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, teacherPath);
    }

    if (!teacherExists) {
      try {
        await setDoc(teacherRef, {
          ...buildTeacherPayload(uid, profile, activeSessionTopic),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, teacherPath);
      }
    }

    const classesPath = `teachers/${uid}/classes`;
    const studentsPath = `teachers/${uid}/students`;
    const obsPath = `teachers/${uid}/observations`;

    const existingClassIds = new Set<string>();
    const existingStudentIds = new Set<string>();
    let existingObsCount = 0;

    try {
      const clsSnap = await getDocsFromServer(
        query(collection(db, classesPath), where('ownerId', '==', uid))
      ).catch(() => getDocs(query(collection(db, classesPath), where('ownerId', '==', uid))));
      clsSnap.forEach((d) => existingClassIds.add(d.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, classesPath);
    }

    try {
      const stdSnap = await getDocsFromServer(
        query(collection(db, studentsPath), where('ownerId', '==', uid))
      ).catch(() => getDocs(query(collection(db, studentsPath), where('ownerId', '==', uid))));
      stdSnap.forEach((d) => existingStudentIds.add(d.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, studentsPath);
    }

    if (!teacherExists) {
      try {
        const obsSnap = await getDocsFromServer(
          query(collection(db, obsPath), where('ownerId', '==', uid))
        ).catch(() => getDocs(query(collection(db, obsPath), where('ownerId', '==', uid))));
        existingObsCount = obsSnap.size;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, obsPath);
      }
    }

    const operations: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

    if (existingClassIds.size === 0 && classes.length > 0) {
      for (const cls of classes) {
        const id = sanitizeId(cls.id, 'cls');
        if (!existingClassIds.has(id)) {
          operations.push({
            ref: doc(db, 'teachers', uid, 'classes', id),
            data: {
              ...buildClassPayload(uid, { ...cls, id }),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
          });
        }
      }
    }

    if (existingStudentIds.size === 0 && students.length > 0) {
      for (const st of students) {
        const id = sanitizeId(st.id, 'std');
        if (!existingStudentIds.has(id)) {
          operations.push({
            ref: doc(db, 'teachers', uid, 'students', id),
            data: {
              ...buildStudentPayload(uid, { ...st, id }),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
          });
        }
      }
    }

    // Only seed initial sample observations when workspace is brand new
    if (!teacherExists && existingClassIds.size === 0 && existingObsCount === 0 && observations.length > 0) {
      for (const obs of observations) {
        const id = sanitizeId(obs.id, 'obs');
        operations.push({
          ref: doc(db, 'teachers', uid, 'observations', id),
          data: {
            ...buildObservationPayload(uid, { ...obs, id }),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }
    }

    const CHUNK_SIZE = 240;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `teachers/${uid}/batch`);
      }
    }
  })().finally(() => {
    workspaceEnsurePromises.delete(uid);
  });

  workspaceEnsurePromises.set(uid, runPromise);
  return runPromise;
}

export interface TeacherSyncCallbacks {
  onWorkspace: (profile: TeacherProfile, activeSessionTopic?: string) => void;
  onClasses: (classes: ClassGroup[]) => void;
  onStudents: (students: Student[]) => void;
  onObservations: (observations: Observation[], hasPendingWrites: boolean, fromCache: boolean) => void;
  onSyncStatus?: (connected: boolean, hasPendingWrites?: boolean) => void;
  onError?: (errorMessage: string) => void;
}

export function subscribeToTeacherData(
  uid: string,
  callbacks: TeacherSyncCallbacks
): () => void {
  const teacherPath = `teachers/${uid}`;
  const classesPath = `teachers/${uid}/classes`;
  const studentsPath = `teachers/${uid}/students`;
  const obsPath = `teachers/${uid}/observations`;

  const unsubTeacher = onSnapshot(
    doc(db, 'teachers', uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      callbacks.onSyncStatus?.(true, snapshot.metadata.hasPendingWrites);
      if (snapshot.exists()) {
        const d = snapshot.data();
        callbacks.onWorkspace(
          {
            name: d.name,
            schoolName: d.schoolName,
            subject: d.subject,
            academicYear: d.academicYear,
          },
          d.activeSessionTopic
        );
      }
    },
    (error) => {
      callbacks.onSyncStatus?.(false);
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onError?.(msg);
      try {
        handleFirestoreError(error, OperationType.GET, teacherPath);
      } catch {
        // Error already logged and surfaced via onError
      }
    }
  );

  const unsubClasses = onSnapshot(
    query(collection(db, classesPath), where('ownerId', '==', uid)),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!snapshot.empty || !snapshot.metadata.fromCache) {
        const list: ClassGroup[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            name: d.name,
            grade: d.grade,
            academicYear: d.academicYear,
            studentCount: d.studentCount,
            scheduleDay: d.scheduleDay,
            scheduleTime: d.scheduleTime,
            colorTag: d.colorTag,
          };
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        if (list.length > 0) {
          callbacks.onClasses(list);
        }
      }
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onError?.(msg);
      try {
        handleFirestoreError(error, OperationType.LIST, classesPath);
      } catch {
        // Error already logged and surfaced via onError
      }
    }
  );

  const unsubStudents = onSnapshot(
    query(collection(db, studentsPath), where('ownerId', '==', uid)),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!snapshot.empty || !snapshot.metadata.fromCache) {
        const list: Student[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id,
            classId: d.classId,
            studentNumber: d.studentNumber,
            firstName: d.firstName,
            lastName: d.lastName,
            gender: d.gender,
            medicalStatus: d.medicalStatus,
          };
        });
        if (list.length > 0 || !snapshot.metadata.fromCache) {
          callbacks.onStudents(list);
        }
      }
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onError?.(msg);
      try {
        handleFirestoreError(error, OperationType.LIST, studentsPath);
      } catch {
        // Error already logged and surfaced via onError
      }
    }
  );

  const unsubObservations = onSnapshot(
    query(collection(db, obsPath), where('ownerId', '==', uid)),
    { includeMetadataChanges: true },
    (snapshot) => {
      // Avoid flashing empty cache before server responds on fresh device login
      if (snapshot.empty && snapshot.metadata.fromCache) {
        return;
      }

      const list: Observation[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: d.id,
          studentId: d.studentId,
          studentName: d.studentName,
          studentNumber: d.studentNumber,
          classId: d.classId,
          className: d.className,
          type: d.type,
          date: d.date,
          time: d.time,
          timestamp: d.timestamp,
          noteText: d.noteText,
          sessionTopic: d.sessionTopic,
          synced: !docSnap.metadata.hasPendingWrites,
        };
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      callbacks.onObservations(
        list,
        snapshot.metadata.hasPendingWrites,
        snapshot.metadata.fromCache
      );
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onError?.(msg);
      try {
        handleFirestoreError(error, OperationType.LIST, obsPath);
      } catch {
        // Error already logged and surfaced via onError
      }
    }
  );

  return () => {
    unsubTeacher();
    unsubClasses();
    unsubStudents();
    unsubObservations();
  };
}

/**
 * Forces an authoritative server fetch for all collections to guarantee identical counts across devices.
 */
export async function fetchAllTeacherDataFromServer(uid: string): Promise<{
  profile?: TeacherProfile;
  activeSessionTopic?: string;
  classes: ClassGroup[];
  students: Student[];
  observations: Observation[];
}> {
  const teacherPath = `teachers/${uid}`;
  const classesPath = `teachers/${uid}/classes`;
  const studentsPath = `teachers/${uid}/students`;
  const obsPath = `teachers/${uid}/observations`;

  let profile: TeacherProfile | undefined;
  let activeSessionTopic: string | undefined;

  try {
    const tSnap = await getDocFromServer(doc(db, 'teachers', uid));
    if (tSnap.exists()) {
      const d = tSnap.data();
      profile = {
        name: d.name,
        schoolName: d.schoolName,
        subject: d.subject,
        academicYear: d.academicYear,
      };
      activeSessionTopic = d.activeSessionTopic;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, teacherPath);
  }

  const classes: ClassGroup[] = [];
  try {
    const clsSnap = await getDocsFromServer(
      query(collection(db, classesPath), where('ownerId', '==', uid))
    );
    clsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      classes.push({
        id: d.id,
        name: d.name,
        grade: d.grade,
        academicYear: d.academicYear,
        studentCount: d.studentCount,
        scheduleDay: d.scheduleDay,
        scheduleTime: d.scheduleTime,
        colorTag: d.colorTag,
      });
    });
    classes.sort((a, b) => a.id.localeCompare(b.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, classesPath);
  }

  const students: Student[] = [];
  try {
    const stdSnap = await getDocsFromServer(
      query(collection(db, studentsPath), where('ownerId', '==', uid))
    );
    stdSnap.forEach((docSnap) => {
      const d = docSnap.data();
      students.push({
        id: d.id,
        classId: d.classId,
        studentNumber: d.studentNumber,
        firstName: d.firstName,
        lastName: d.lastName,
        gender: d.gender,
        medicalStatus: d.medicalStatus,
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, studentsPath);
  }

  const observations: Observation[] = [];
  try {
    const obsSnap = await getDocsFromServer(
      query(collection(db, obsPath), where('ownerId', '==', uid))
    );
    obsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      observations.push({
        id: d.id,
        studentId: d.studentId,
        studentName: d.studentName,
        studentNumber: d.studentNumber,
        classId: d.classId,
        className: d.className,
        type: d.type,
        date: d.date,
        time: d.time,
        timestamp: d.timestamp,
        noteText: d.noteText,
        sessionTopic: d.sessionTopic,
        synced: true,
      });
    });
    observations.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, obsPath);
  }

  return { profile, activeSessionTopic, classes, students, observations };
}

export async function pushObservationToFirestore(uid: string, obs: Observation): Promise<void> {
  const id = sanitizeId(obs.id, 'obs');
  const path = `teachers/${uid}/observations/${id}`;
  const obsRef = doc(db, 'teachers', uid, 'observations', id);

  try {
    const existingSnap = await getDoc(obsRef);
    if (existingSnap.exists()) {
      // Document already synced on a prior attempt
      return;
    }

    await setDoc(obsRef, {
      ...buildObservationPayload(uid, { ...obs, id }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteObservationFromFirestore(uid: string, obsId: string): Promise<void> {
  const id = sanitizeId(obsId, 'obs');
  const path = `teachers/${uid}/observations/${id}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'observations', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function pushClassToFirestore(uid: string, cls: ClassGroup): Promise<void> {
  const id = sanitizeId(cls.id, 'cls');
  const path = `teachers/${uid}/classes/${id}`;
  try {
    await setDoc(doc(db, 'teachers', uid, 'classes', id), {
      ...buildClassPayload(uid, { ...cls, id }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function pushStudentToFirestore(
  uid: string,
  student: Student,
  updatedClassCount: number
): Promise<void> {
  const id = sanitizeId(student.id, 'std');
  const studentPath = `teachers/${uid}/students/${id}`;
  const classPath = `teachers/${uid}/classes/${student.classId}`;
  try {
    await setDoc(doc(db, 'teachers', uid, 'students', id), {
      ...buildStudentPayload(uid, { ...student, id }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'teachers', uid, 'classes', student.classId), {
      studentCount: clampInt(updatedClassCount, 0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${studentPath} / ${classPath}`);
  }
}

export async function deleteStudentFromFirestore(
  uid: string,
  studentId: string,
  classId: string,
  updatedClassCount: number
): Promise<void> {
  const id = sanitizeId(studentId, 'std');
  const path = `teachers/${uid}/students/${id}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'students', id));
    await updateDoc(doc(db, 'teachers', uid, 'classes', classId), {
      studentCount: clampInt(updatedClassCount, 0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function updateSessionTopicInFirestore(
  uid: string,
  activeSessionTopic: string
): Promise<void> {
  const path = `teachers/${uid}`;
  try {
    await updateDoc(doc(db, 'teachers', uid), {
      activeSessionTopic: clampStr(activeSessionTopic, 160, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function importStudentsBatchToFirestore(
  uid: string,
  classId: string,
  newStudents: Student[],
  oldStudentIds: string[]
): Promise<void> {
  const path = `teachers/${uid}/students`;
  const ops: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: Record<string, unknown> }> = [];

  for (const oldId of oldStudentIds) {
    ops.push({
      type: 'delete',
      ref: doc(db, 'teachers', uid, 'students', sanitizeId(oldId, 'std')),
    });
  }

  for (const st of newStudents) {
    const id = sanitizeId(st.id, 'std');
    ops.push({
      type: 'set',
      ref: doc(db, 'teachers', uid, 'students', id),
      data: {
        ...buildStudentPayload(uid, { ...st, id }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
  }

  const CHUNK_SIZE = 240;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'delete') batch.delete(op.ref);
      else if (op.data) batch.set(op.ref, op.data);
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  try {
    await updateDoc(doc(db, 'teachers', uid, 'classes', classId), {
      studentCount: clampInt(newStudents.length, 0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `teachers/${uid}/classes/${classId}`);
  }
}
