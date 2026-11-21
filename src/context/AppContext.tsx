import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  ClassGroup,
  Student,
  Observation,
  ObservationType,
  TeacherProfile,
  ThemeMode,
  CloudConnectionState,
  GoogleAuthUser,
} from '../types';
import {
  initialClasses,
  initialStudents,
  initialObservations,
  initialTeacherProfile,
} from '../data/mockData';
import {
  onFirebaseAuthChange,
  signInWithGoogle,
  signOutGoogle,
  ensureTeacherWorkspace,
  subscribeToTeacherData,
  fetchAllTeacherDataFromServer,
  pushObservationToFirestore,
  deleteObservationFromFirestore,
  pushClassToFirestore,
  pushStudentToFirestore,
  deleteStudentFromFirestore,
  updateSessionTopicInFirestore,
  importStudentsBatchToFirestore,
} from '../firebase';
import { getLocalDateStr, getLocalTimeStr } from '../utils/date';
import { CurrentScheduleStatus, getCurrentScheduleStatus } from '../data/scheduleData';

type PendingOp =
  | { type: 'add_obs'; observation: Observation }
  | { type: 'delete_obs'; id: string };

interface AppContextType {
  classes: ClassGroup[];
  students: Student[];
  observations: Observation[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  scheduleStatus: CurrentScheduleStatus;
  hasManualClassSelection: boolean;
  clearManualClassSelection: () => void;
  followLiveSchedule: () => void;
  activeSessionTopic: string;
  setActiveSessionTopic: (topic: string) => void;
  teacherProfile: TeacherProfile;
  setTeacherProfile: React.Dispatch<React.SetStateAction<TeacherProfile>>;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  authUser: GoogleAuthUser | null;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logoutFromGoogle: () => Promise<void>;
  cloudState: CloudConnectionState;
  cloudError: string | null;
  pendingSyncCount: number;
  syncNowFromCloud: () => Promise<void>;
  selectedStudentForAction: Student | null;
  setSelectedStudentForAction: (student: Student | null) => void;
  addObservation: (studentId: string, type: ObservationType, noteText?: string) => void;
  deleteObservation: (id: string) => void;
  undoLastObservation: () => void;
  lastAddedObservation: Observation | null;
  clearLastAddedObservation: () => void;
  importStudentsList: (
    classId: string,
    parsedStudents: Array<{
      firstName: string;
      lastName: string;
      studentNumber: number;
      gender: 'M' | 'F';
    }>
  ) => void;
  addClass: (cls: Omit<ClassGroup, 'id' | 'studentCount'>) => void;
  addStudent: (student: Omit<Student, 'id'>) => void;
  deleteStudent: (id: string) => void;
  activeClass: ClassGroup | undefined;
  activeStudents: Student[];
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  syncIndicatorTime: number | null;
  isSyncing: boolean;
  triggerSync: (durationMs?: number) => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GUEST_STORAGE_PREFIX = 'eps_track_data_v2_';
const PENDING_OPS_KEY = 'eps_track_pending_ops_v1';

function getStoragePrefix(uid?: string | null): string {
  return uid ? `eps_track_cloud_${uid}_` : GUEST_STORAGE_PREFIX;
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('eps_theme_mode');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    localStorage.setItem('eps_theme_mode', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    }
  }, [theme]);

  const [classes, setClasses] = useState<ClassGroup[]>(() =>
    safeParseJson(localStorage.getItem(GUEST_STORAGE_PREFIX + 'classes'), initialClasses)
  );

  const [students, setStudents] = useState<Student[]>(() =>
    safeParseJson(localStorage.getItem(GUEST_STORAGE_PREFIX + 'students'), initialStudents)
  );

  const [observations, setObservations] = useState<Observation[]>(() =>
    safeParseJson(localStorage.getItem(GUEST_STORAGE_PREFIX + 'observations'), initialObservations)
  );

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() =>
    safeParseJson(localStorage.getItem(GUEST_STORAGE_PREFIX + 'profile'), initialTeacherProfile)
  );

  const [pendingOps, setPendingOps] = useState<PendingOp[]>(() =>
    safeParseJson(localStorage.getItem(PENDING_OPS_KEY), [])
  );

  const [scheduleStatus, setScheduleStatus] = useState<CurrentScheduleStatus>(() =>
    getCurrentScheduleStatus()
  );
  const [hasManualClassSelection, setHasManualClassSelection] = useState<boolean>(false);
  const lastAutoSlotIdRef = useRef<string | null>(scheduleStatus.activeSlot?.id ?? null);

  const [activeClassId, setActiveClassIdState] = useState<string>(
    () => scheduleStatus.activeSlot?.classId || classes[0]?.id || 'cls-1ap-a'
  );

  const setActiveClassId = useCallback((id: string) => {
    setHasManualClassSelection(true);
    setActiveClassIdState(id);
  }, []);

  const clearManualClassSelection = useCallback(() => {
    setHasManualClassSelection(false);
  }, []);

  const followLiveSchedule = useCallback(() => {
    const latest = getCurrentScheduleStatus();
    setScheduleStatus(latest);
    setHasManualClassSelection(false);
    if (latest.activeSlot) {
      lastAutoSlotIdRef.current = latest.activeSlot.id;
      setActiveClassIdState(latest.activeSlot.classId);
    }
  }, []);

  // Keep schedule clock synchronized every 30s and whenever user returns to app
  useEffect(() => {
    const refreshSchedule = () => {
      const latest = getCurrentScheduleStatus();
      setScheduleStatus(latest);
      const nextSlotId = latest.activeSlot?.id ?? null;

      if (latest.activeSlot && nextSlotId !== lastAutoSlotIdRef.current) {
        // A new scheduled session just started — automatically switch to it
        lastAutoSlotIdRef.current = nextSlotId;
        setHasManualClassSelection(false);
        setActiveClassIdState(latest.activeSlot.classId);
      } else if (!latest.activeSlot && lastAutoSlotIdRef.current !== null) {
        // Previous session ended
        lastAutoSlotIdRef.current = null;
      }
    };

    const interval = setInterval(refreshSchedule, 30000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshSchedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  const [activeSessionTopic, setActiveSessionTopicState] = useState<string>(
    'ألعاب القوى المصغرة - التوازن والتنقل'
  );
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<Student | null>(null);
  const [lastAddedObservation, setLastAddedObservation] = useState<Observation | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncIndicatorTime, setSyncIndicatorTime] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [authUser, setAuthUser] = useState<GoogleAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [workspaceReadyUid, setWorkspaceReadyUid] = useState<string | null>(null);
  const [cloudState, setCloudState] = useState<CloudConnectionState>('disconnected');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const initialSeedRef = useRef({
    teacherProfile,
    activeSessionTopic,
    classes,
    students,
    observations,
  });
  initialSeedRef.current = {
    teacherProfile,
    activeSessionTopic,
    classes,
    students,
    observations,
  };

  const pendingOpsRef = useRef<PendingOp[]>(pendingOps);
  pendingOpsRef.current = pendingOps;

  const isFlushingRef = useRef<boolean>(false);

  // Persist pending queue to localStorage
  useEffect(() => {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pendingOps));
  }, [pendingOps]);

  // Browser online/offline tracking
  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSync = useCallback((durationMs: number = 1800) => {
    setIsSyncing(true);
    setSyncIndicatorTime(Date.now());
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      setIsSyncing(false);
    }, durationMs);
  }, []);

  // Helper to merge server observations with unconfirmed local pending operations
  const mergeObservationsWithPending = useCallback(
    (serverList: Observation[]): Observation[] => {
      const pending = pendingOpsRef.current;
      if (pending.length === 0) return serverList;

      const pendingDeleteIds = new Set(
        pending.filter((op) => op.type === 'delete_obs').map((op) => op.id)
      );
      const serverIds = new Set(serverList.map((o) => o.id));

      const filteredServer = serverList.filter((o) => !pendingDeleteIds.has(o.id));
      const pendingAdds = pending
        .filter(
          (op): op is Extract<PendingOp, { type: 'add_obs' }> =>
            op.type === 'add_obs' &&
            !serverIds.has(op.observation.id) &&
            !pendingDeleteIds.has(op.observation.id)
        )
        .map((op) => ({ ...op.observation, synced: false }));

      const merged = [...pendingAdds, ...filteredServer];
      merged.sort((a, b) => b.timestamp - a.timestamp);
      return merged;
    },
    []
  );

  // Flush queued observations (created offline or before workspace finished) to Firestore
  const flushPendingQueue = useCallback(
    async (uid: string) => {
      if (isFlushingRef.current || !navigator.onLine) return;
      const queue = [...pendingOpsRef.current];
      if (queue.length === 0) return;

      isFlushingRef.current = true;
      setIsSyncing(true);

      const remaining: PendingOp[] = [];
      let hadError = false;

      for (const op of queue) {
        try {
          if (op.type === 'add_obs') {
            await pushObservationToFirestore(uid, op.observation);
          } else if (op.type === 'delete_obs') {
            await deleteObservationFromFirestore(uid, op.id);
          }
        } catch (err) {
          console.error('Failed to flush pending sync operation:', err);
          remaining.push(op);
          hadError = true;
        }
      }

      setPendingOps(remaining);
      if (!hadError) {
        setCloudError(null);
        setCloudState('connected');
      } else {
        setCloudError('تعذر رفع بعض التغييرات، سيتم إعادة المحاولة تلقائياً');
      }

      isFlushingRef.current = false;
      setIsSyncing(false);
    },
    []
  );

  // Listen to Firebase Auth state and connect Firestore real-time listeners
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let activeAuthSession = 0;

    const unsubAuth = onFirebaseAuthChange(async (user) => {
      const sessionToken = ++activeAuthSession;

      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!user) {
        setAuthUser(null);
        setWorkspaceReadyUid(null);
        setIsAuthLoading(false);
        setCloudState('disconnected');
        setCloudError(null);
        return;
      }

      const cloudPrefix = getStoragePrefix(user.uid);
      // Immediately hydrate from user-scoped cache if available (not guest/stale cache)
      const cachedClasses = safeParseJson<ClassGroup[] | null>(
        localStorage.getItem(cloudPrefix + 'classes'),
        null
      );
      const cachedStudents = safeParseJson<Student[] | null>(
        localStorage.getItem(cloudPrefix + 'students'),
        null
      );
      const cachedObs = safeParseJson<Observation[] | null>(
        localStorage.getItem(cloudPrefix + 'observations'),
        null
      );
      const cachedProfile = safeParseJson<TeacherProfile | null>(
        localStorage.getItem(cloudPrefix + 'profile'),
        null
      );

      if (cachedClasses && cachedClasses.length > 0) setClasses(cachedClasses);
      if (cachedStudents && cachedStudents.length > 0) setStudents(cachedStudents);
      if (cachedObs) setObservations(mergeObservationsWithPending(cachedObs));
      if (cachedProfile) setTeacherProfile(cachedProfile);

      setAuthUser({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
      });
      setIsAuthLoading(false);
      setCloudState('connecting');
      setCloudError(null);

      try {
        const seed = initialSeedRef.current;

        // Collect any local unsynced observations recorded while logged out so they aren't lost
        const unsyncedGuestObs = seed.observations.filter((o) => o.synced === false);
        if (unsyncedGuestObs.length > 0) {
          setPendingOps((prev) => {
            const existingIds = new Set(
              prev
                .filter((p): p is Extract<PendingOp, { type: 'add_obs' }> => p.type === 'add_obs')
                .map((p) => p.observation.id)
            );
            const extras: PendingOp[] = unsyncedGuestObs
              .filter((o) => !existingIds.has(o.id))
              .map((o) => ({ type: 'add_obs', observation: o }));
            return extras.length > 0 ? [...prev, ...extras] : prev;
          });
        }

        await ensureTeacherWorkspace(
          user.uid,
          seed.teacherProfile,
          seed.activeSessionTopic,
          initialClasses,
          initialStudents,
          initialObservations
        );

        if (sessionToken !== activeAuthSession) return;

        setWorkspaceReadyUid(user.uid);

        // Flush any pending offline/pre-login observations immediately
        await flushPendingQueue(user.uid);

        if (sessionToken !== activeAuthSession) return;

        unsubFirestore = subscribeToTeacherData(user.uid, {
          onWorkspace: (profile, topic) => {
            setTeacherProfile(profile);
            if (typeof topic === 'string' && topic.length > 0) {
              setActiveSessionTopicState(topic);
            }
          },
          onClasses: (clsList) => {
            setClasses(clsList);
          },
          onStudents: (stdList) => {
            setStudents(stdList);
          },
          onObservations: (obsList, hasPendingWrites) => {
            const merged = mergeObservationsWithPending(obsList);
            setObservations(merged);
            if (hasPendingWrites) {
              setIsSyncing(true);
            } else {
              setIsSyncing(false);
            }
          },
          onSyncStatus: (connected, hasPendingWrites) => {
            setCloudState(connected ? 'connected' : 'error');
            if (typeof hasPendingWrites === 'boolean') {
              setIsSyncing(hasPendingWrites);
            }
          },
          onError: (msg) => {
            setCloudState('error');
            setCloudError(msg);
          },
        });

        setCloudState('connected');
      } catch (err: unknown) {
        if (sessionToken !== activeAuthSession) return;
        const message = err instanceof Error ? err.message : 'تعذر الاتصال بـ Google Firestore';
        console.error('Firebase sync initialization error:', message);
        setCloudState('error');
        setCloudError(message);
      }
    });

    return () => {
      activeAuthSession++;
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, [flushPendingQueue, mergeObservationsWithPending]);

  // Automatically flush pending queue whenever connection returns or workspace becomes ready
  useEffect(() => {
    if (authUser && workspaceReadyUid === authUser.uid && isOnline && pendingOps.length > 0) {
      flushPendingQueue(authUser.uid);
    }
  }, [authUser, workspaceReadyUid, isOnline, pendingOps.length, flushPendingQueue]);

  // Force an authoritative pull from Firestore server on demand
  const syncNowFromCloud = useCallback(async () => {
    if (!authUser) return;
    setIsSyncing(true);
    setCloudError(null);
    try {
      if (workspaceReadyUid === authUser.uid && isOnline && pendingOpsRef.current.length > 0) {
        await flushPendingQueue(authUser.uid);
      }
      const data = await fetchAllTeacherDataFromServer(authUser.uid);
      if (data.profile) setTeacherProfile(data.profile);
      if (typeof data.activeSessionTopic === 'string' && data.activeSessionTopic.length > 0) {
        setActiveSessionTopicState(data.activeSessionTopic);
      }
      if (data.classes.length > 0) setClasses(data.classes);
      if (data.students.length > 0) setStudents(data.students);
      setObservations(mergeObservationsWithPending(data.observations));
      setCloudState('connected');
      setSyncIndicatorTime(Date.now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر التحديث من الخادم';
      setCloudState('error');
      setCloudError(msg);
    } finally {
      setIsSyncing(false);
    }
  }, [authUser, workspaceReadyUid, isOnline, flushPendingQueue, mergeObservationsWithPending]);

  // Re-sync automatically when tab/phone returns to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        authUser &&
        workspaceReadyUid === authUser.uid &&
        navigator.onLine
      ) {
        flushPendingQueue(authUser.uid);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [authUser, workspaceReadyUid, flushPendingQueue]);

  const loginWithGoogle = useCallback(async () => {
    setCloudState('connecting');
    setCloudError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول عبر Google';
      setCloudState('error');
      setCloudError(msg);
      throw err;
    }
  }, []);

  const logoutFromGoogle = useCallback(async () => {
    await signOutGoogle();
    setWorkspaceReadyUid(null);
    setCloudState('disconnected');
  }, []);

  const setActiveSessionTopic = useCallback(
    (topic: string) => {
      setActiveSessionTopicState(topic);
      if (authUser && workspaceReadyUid === authUser.uid) {
        triggerSync(1400);
        updateSessionTopicInFirestore(authUser.uid, topic).catch((err) => {
          console.warn('Session topic sync error:', err);
        });
      }
    },
    [authUser, workspaceReadyUid, triggerSync]
  );

  // Sync to LocalStorage scoped by active user (cloud cache vs guest)
  useEffect(() => {
    const prefix = getStoragePrefix(authUser?.uid);
    localStorage.setItem(prefix + 'classes', JSON.stringify(classes));
  }, [classes, authUser?.uid]);

  useEffect(() => {
    const prefix = getStoragePrefix(authUser?.uid);
    localStorage.setItem(prefix + 'students', JSON.stringify(students));
  }, [students, authUser?.uid]);

  useEffect(() => {
    const prefix = getStoragePrefix(authUser?.uid);
    localStorage.setItem(prefix + 'observations', JSON.stringify(observations));
  }, [observations, authUser?.uid]);

  useEffect(() => {
    const prefix = getStoragePrefix(authUser?.uid);
    localStorage.setItem(prefix + 'profile', JSON.stringify(teacherProfile));
  }, [teacherProfile, authUser?.uid]);

  // Keep class student counts always synchronized with actual students array
  const normalizedClasses = useMemo(() => {
    if (students.length === 0) return classes;
    const countByClass = new Map<string, number>();
    for (const s of students) {
      countByClass.set(s.classId, (countByClass.get(s.classId) || 0) + 1);
    }
    return classes.map((c) => {
      const actual = countByClass.get(c.id);
      return actual !== undefined ? { ...c, studentCount: actual } : c;
    });
  }, [classes, students]);

  const activeClass =
    normalizedClasses.find((c) => c.id === activeClassId) || normalizedClasses[0];
  const activeStudents = useMemo(
    () =>
      students
        .filter((s) => s.classId === activeClassId)
        .sort((a, b) => a.studentNumber - b.studentNumber),
    [students, activeClassId]
  );

  const triggerFeedback = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  }, []);

  const addObservation = useCallback(
    (studentId: string, type: ObservationType, noteText?: string) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      const targetClass = normalizedClasses.find((c) => c.id === student.classId);
      const now = new Date();
      const dateStr = getLocalDateStr(now);
      const timeStr = getLocalTimeStr(now);

      const newObs: Observation = {
        id: 'obs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentNumber: student.studentNumber,
        classId: student.classId,
        className: targetClass ? targetClass.name : 'القسم',
        type,
        date: dateStr,
        time: timeStr,
        timestamp: Date.now(),
        noteText: noteText || '',
        sessionTopic: activeSessionTopic,
        synced: false,
      };

      setObservations((prev) => [newObs, ...prev]);
      setLastAddedObservation(newObs);
      triggerSync(1800);
      triggerFeedback();

      if (authUser && workspaceReadyUid === authUser.uid && isOnline) {
        pushObservationToFirestore(authUser.uid, newObs)
          .then(() => {
            setObservations((prev) =>
              prev.map((item) => (item.id === newObs.id ? { ...item, synced: true } : item))
            );
            setCloudError(null);
          })
          .catch((err) => {
            console.error('Firestore push observation failed, queuing for retry:', err);
            setPendingOps((prev) => [...prev, { type: 'add_obs', observation: newObs }]);
            setCloudError('تعذر الرفع الفوري، تم الحفظ في قائمة المزامنة');
          });
      } else {
        setPendingOps((prev) => [...prev, { type: 'add_obs', observation: newObs }]);
      }

      setTimeout(() => {
        setLastAddedObservation((current) => (current?.id === newObs.id ? null : current));
      }, 6000);
    },
    [
      students,
      normalizedClasses,
      activeSessionTopic,
      isOnline,
      authUser,
      workspaceReadyUid,
      triggerFeedback,
      triggerSync,
    ]
  );

  const deleteObservation = useCallback(
    (id: string) => {
      setObservations((prev) => prev.filter((obs) => obs.id !== id));
      triggerSync(1500);

      // Remove any queued unsent add for this observation ID
      const wasQueuedOnly = pendingOpsRef.current.some(
        (op) => op.type === 'add_obs' && op.observation.id === id
      );
      if (wasQueuedOnly) {
        setPendingOps((prev) =>
          prev.filter((op) => !(op.type === 'add_obs' && op.observation.id === id))
        );
        return;
      }

      if (authUser && workspaceReadyUid === authUser.uid && isOnline) {
        deleteObservationFromFirestore(authUser.uid, id).catch((err) => {
          console.error('Firestore delete observation failed, queuing retry:', err);
          setPendingOps((prev) => [...prev, { type: 'delete_obs', id }]);
        });
      } else {
        setPendingOps((prev) => [...prev, { type: 'delete_obs', id }]);
      }
    },
    [triggerSync, authUser, workspaceReadyUid, isOnline]
  );

  const undoLastObservation = useCallback(() => {
    if (!lastAddedObservation) return;
    deleteObservation(lastAddedObservation.id);
    setLastAddedObservation(null);
  }, [lastAddedObservation, deleteObservation]);

  const clearLastAddedObservation = useCallback(() => {
    setLastAddedObservation(null);
  }, []);

  const importStudentsList = useCallback(
    (
      classId: string,
      parsedStudents: Array<{
        firstName: string;
        lastName: string;
        studentNumber: number;
        gender: 'M' | 'F';
      }>
    ) => {
      const oldIds = students.filter((s) => s.classId === classId).map((s) => s.id);
      const newStudents: Student[] = parsedStudents.map((item, idx) => ({
        id: `std-${classId}-${Date.now()}-${idx}`,
        classId,
        studentNumber: item.studentNumber,
        firstName: item.firstName,
        lastName: item.lastName,
        gender: item.gender,
      }));

      setStudents((prev) => {
        const filtered = prev.filter((s) => s.classId !== classId);
        return [...filtered, ...newStudents];
      });

      setClasses((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, studentCount: newStudents.length } : c))
      );
      triggerSync(2400);

      if (authUser && workspaceReadyUid === authUser.uid) {
        importStudentsBatchToFirestore(authUser.uid, classId, newStudents, oldIds).catch((err) => {
          console.error('Firestore import batch error:', err);
          setCloudError('تعذر مزامنة قائمة التلاميذ المستوردة');
        });
      }
    },
    [students, authUser, workspaceReadyUid, triggerSync]
  );

  const addClass = useCallback(
    (cls: Omit<ClassGroup, 'id' | 'studentCount'>) => {
      const newClass: ClassGroup = {
        ...cls,
        id: 'cls-' + Date.now().toString(36),
        studentCount: 0,
      };
      setClasses((prev) => [...prev, newClass]);
      setActiveClassId(newClass.id);
      triggerSync(2000);

      if (authUser && workspaceReadyUid === authUser.uid) {
        pushClassToFirestore(authUser.uid, newClass).catch((err) => {
          console.error('Firestore push class error:', err);
        });
      }
    },
    [authUser, workspaceReadyUid, triggerSync]
  );

  const addStudent = useCallback(
    (student: Omit<Student, 'id'>) => {
      const newStudent: Student = {
        ...student,
        id: 'std-' + Date.now().toString(36),
      };
      const currentClassCount = students.filter((s) => s.classId === student.classId).length;
      const nextCount = currentClassCount + 1;

      setStudents((prev) => [...prev, newStudent]);
      setClasses((prev) =>
        prev.map((c) => (c.id === student.classId ? { ...c, studentCount: nextCount } : c))
      );
      triggerSync(2000);

      if (authUser && workspaceReadyUid === authUser.uid) {
        pushStudentToFirestore(authUser.uid, newStudent, nextCount).catch((err) => {
          console.error('Firestore push student error:', err);
        });
      }
    },
    [students, authUser, workspaceReadyUid, triggerSync]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      const target = students.find((s) => s.id === id);
      if (!target) return;
      const remainingInClass = students.filter(
        (s) => s.classId === target.classId && s.id !== id
      ).length;

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setObservations((prev) => prev.filter((o) => o.studentId !== id));
      setClasses((prev) =>
        prev.map((c) => (c.id === target.classId ? { ...c, studentCount: remainingInClass } : c))
      );
      triggerSync(2000);

      if (authUser && workspaceReadyUid === authUser.uid) {
        deleteStudentFromFirestore(authUser.uid, id, target.classId, remainingInClass).catch(
          (err) => {
            console.error('Firestore delete student error:', err);
          }
        );
      }
    },
    [students, authUser, workspaceReadyUid, triggerSync]
  );

  const resetToDefaultData = useCallback(() => {
    if (authUser) {
      // When connected to Google Cloud, refresh directly from server instead of desyncing local state
      void syncNowFromCloud();
      return;
    }
    setClasses(initialClasses);
    setStudents(initialStudents);
    setObservations(initialObservations);
    setTeacherProfile(initialTeacherProfile);
    setActiveClassId(initialClasses[0].id);
    localStorage.removeItem(GUEST_STORAGE_PREFIX + 'classes');
    localStorage.removeItem(GUEST_STORAGE_PREFIX + 'students');
    localStorage.removeItem(GUEST_STORAGE_PREFIX + 'observations');
    localStorage.removeItem(GUEST_STORAGE_PREFIX + 'profile');
  }, [authUser, syncNowFromCloud]);

  return (
    <AppContext.Provider
      value={{
        classes: normalizedClasses,
        students,
        observations,
        activeClassId,
        setActiveClassId,
        scheduleStatus,
        hasManualClassSelection,
        clearManualClassSelection,
        followLiveSchedule,
        activeSessionTopic,
        setActiveSessionTopic,
        teacherProfile,
        setTeacherProfile,
        theme,
        setTheme,
        toggleTheme,
        authUser,
        isAuthLoading,
        loginWithGoogle,
        logoutFromGoogle,
        cloudState,
        cloudError,
        pendingSyncCount: pendingOps.length,
        syncNowFromCloud,
        selectedStudentForAction,
        setSelectedStudentForAction,
        addObservation,
        deleteObservation,
        undoLastObservation,
        lastAddedObservation,
        clearLastAddedObservation,
        importStudentsList,
        addClass,
        addStudent,
        deleteStudent,
        activeClass,
        activeStudents,
        isOnline,
        setIsOnline,
        syncIndicatorTime,
        isSyncing,
        triggerSync,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
