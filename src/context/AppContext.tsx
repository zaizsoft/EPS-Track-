import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { initialClasses, initialStudents, initialObservations, initialTeacherProfile } from '../data/mockData';
import {
  onFirebaseAuthChange,
  signInWithGoogle,
  signOutGoogle,
  ensureTeacherWorkspace,
  subscribeToTeacherData,
  pushObservationToFirestore,
  deleteObservationFromFirestore,
  pushClassToFirestore,
  pushStudentToFirestore,
  deleteStudentFromFirestore,
  updateSessionTopicInFirestore,
  importStudentsBatchToFirestore,
} from '../firebase';

interface AppContextType {
  classes: ClassGroup[];
  students: Student[];
  observations: Observation[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
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
  selectedStudentForAction: Student | null;
  setSelectedStudentForAction: (student: Student | null) => void;
  addObservation: (studentId: string, type: ObservationType, noteText?: string) => void;
  deleteObservation: (id: string) => void;
  undoLastObservation: () => void;
  lastAddedObservation: Observation | null;
  clearLastAddedObservation: () => void;
  importStudentsList: (
    classId: string,
    parsedStudents: Array<{ firstName: string; lastName: string; studentNumber: number; gender: 'M' | 'F' }>
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

const LOCAL_STORAGE_KEY_PREFIX = 'eps_track_data_v2_';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state: default to 'dark' with toggle support
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

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'classes');
    return saved ? JSON.parse(saved) : initialClasses;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'students');
    return saved ? JSON.parse(saved) : initialStudents;
  });

  const [observations, setObservations] = useState<Observation[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'observations');
    return saved ? JSON.parse(saved) : initialObservations;
  });

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'profile');
    return saved ? JSON.parse(saved) : initialTeacherProfile;
  });

  const [activeClassId, setActiveClassId] = useState<string>(classes[0]?.id || 'cls-1ap-a');
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

  // Firebase Auth & Firestore state
  const [authUser, setAuthUser] = useState<GoogleAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [cloudState, setCloudState] = useState<CloudConnectionState>('disconnected');
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Keep latest local state accessible in auth effect without re-subscribing
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

  const triggerSync = useCallback((durationMs: number = 2200) => {
    setIsSyncing(true);
    setSyncIndicatorTime(Date.now());
    const timer = setTimeout(() => {
      setIsSyncing(false);
    }, durationMs);
    return () => clearTimeout(timer);
  }, []);

  // Listen to Firebase Auth state and connect Firestore real-time listeners
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let isCancelled = false;

    const unsubAuth = onFirebaseAuthChange(async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!user) {
        setAuthUser(null);
        setIsAuthLoading(false);
        setCloudState('disconnected');
        setCloudError(null);
        return;
      }

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
        await ensureTeacherWorkspace(
          user.uid,
          seed.teacherProfile,
          seed.activeSessionTopic,
          seed.classes,
          seed.students,
          seed.observations
        );

        if (isCancelled) return;

        unsubFirestore = subscribeToTeacherData(user.uid, {
          onWorkspace: (profile, topic) => {
            setTeacherProfile(profile);
            if (topic) setActiveSessionTopicState(topic);
          },
          onClasses: (clsList) => {
            setClasses(clsList);
          },
          onStudents: (stdList) => {
            setStudents(stdList);
          },
          onObservations: (obsList) => {
            setObservations(obsList);
          },
          onSyncStatus: (connected) => {
            setCloudState(connected ? 'connected' : 'error');
          },
        });

        setCloudState('connected');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'تعذر الاتصال بـ Google Firestore';
        console.error('Firebase sync initialization error:', message);
        setCloudState('error');
        setCloudError(message);
      }
    });

    return () => {
      isCancelled = true;
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

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
    setCloudState('disconnected');
  }, []);

  const setActiveSessionTopic = useCallback(
    (topic: string) => {
      setActiveSessionTopicState(topic);
      if (authUser && isOnline) {
        triggerSync(1400);
        updateSessionTopicInFirestore(authUser.uid, topic).catch((err) => {
          console.warn('Session topic sync error:', err);
        });
      }
    },
    [authUser, isOnline, triggerSync]
  );

  // Sync to LocalStorage for offline cache
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'observations', JSON.stringify(observations));
  }, [observations]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'profile', JSON.stringify(teacherProfile));
  }, [teacherProfile]);

  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const activeStudents = students
    .filter((s) => s.classId === activeClassId)
    .sort((a, b) => a.studentNumber - b.studentNumber);

  // Subtle vibration feedback
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

      const targetClass = classes.find((c) => c.id === student.classId);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}:${seconds}`;

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
        synced: Boolean(authUser && isOnline),
      };

      setObservations((prev) => [newObs, ...prev]);
      setLastAddedObservation(newObs);
      triggerSync(2000);
      triggerFeedback();

      if (authUser) {
        pushObservationToFirestore(authUser.uid, newObs).catch((err) => {
          console.warn('Firestore push observation error:', err);
        });
      }

      setTimeout(() => {
        setLastAddedObservation((current) => (current?.id === newObs.id ? null : current));
      }, 6000);
    },
    [students, classes, activeSessionTopic, isOnline, authUser, triggerFeedback, triggerSync]
  );

  const deleteObservation = useCallback(
    (id: string) => {
      setObservations((prev) => prev.filter((obs) => obs.id !== id));
      triggerSync(1600);
      if (authUser) {
        deleteObservationFromFirestore(authUser.uid, id).catch((err) => {
          console.warn('Firestore delete observation error:', err);
        });
      }
    },
    [triggerSync, authUser]
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
      parsedStudents: Array<{ firstName: string; lastName: string; studentNumber: number; gender: 'M' | 'F' }>
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

      if (authUser) {
        importStudentsBatchToFirestore(authUser.uid, classId, newStudents, oldIds).catch((err) => {
          console.warn('Firestore import batch error:', err);
        });
      }
    },
    [students, authUser, triggerSync]
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

      if (authUser) {
        pushClassToFirestore(authUser.uid, newClass).catch((err) => {
          console.warn('Firestore push class error:', err);
        });
      }
    },
    [authUser, triggerSync]
  );

  const addStudent = useCallback(
    (student: Omit<Student, 'id'>) => {
      const newStudent: Student = {
        ...student,
        id: 'std-' + Date.now().toString(36),
      };
      const currentClass = classes.find((c) => c.id === student.classId);
      const nextCount = (currentClass?.studentCount || 0) + 1;

      setStudents((prev) => [...prev, newStudent]);
      setClasses((prev) =>
        prev.map((c) => (c.id === student.classId ? { ...c, studentCount: nextCount } : c))
      );
      triggerSync(2000);

      if (authUser) {
        pushStudentToFirestore(authUser.uid, newStudent, nextCount).catch((err) => {
          console.warn('Firestore push student error:', err);
        });
      }
    },
    [classes, authUser, triggerSync]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      const target = students.find((s) => s.id === id);
      if (!target) return;
      const currentClass = classes.find((c) => c.id === target.classId);
      const nextCount = Math.max(0, (currentClass?.studentCount || 1) - 1);

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setObservations((prev) => prev.filter((o) => o.studentId !== id));
      setClasses((prev) =>
        prev.map((c) => (c.id === target.classId ? { ...c, studentCount: nextCount } : c))
      );
      triggerSync(2000);

      if (authUser) {
        deleteStudentFromFirestore(authUser.uid, id, target.classId, nextCount).catch((err) => {
          console.warn('Firestore delete student error:', err);
        });
      }
    },
    [students, classes, authUser, triggerSync]
  );

  const resetToDefaultData = useCallback(() => {
    setClasses(initialClasses);
    setStudents(initialStudents);
    setObservations(initialObservations);
    setTeacherProfile(initialTeacherProfile);
    setActiveClassId(initialClasses[0].id);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + 'classes');
    localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + 'students');
    localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + 'observations');
    localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + 'profile');
  }, []);

  return (
    <AppContext.Provider
      value={{
        classes,
        students,
        observations,
        activeClassId,
        setActiveClassId,
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
